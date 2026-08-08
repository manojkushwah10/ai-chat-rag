import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { queryChunks } from "@/lib/pinecone";
import { streamChatCompletion } from "@/lib/groq";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit";
import type { ChatRequestBody, ChatStreamEvent } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUESTION_LENGTH = 2000;
const MAX_HISTORY_TURNS = 40;
const MAX_TURN_LENGTH = 4000;
const MAX_LOCAL_DATETIME_LENGTH = 100;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`chat:${ip}`, { limit: 20, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds);
  }

  const body: ChatRequestBody = await req.json();
  const { documentId, question, history, localDateTime } = body;

  if (!documentId || !UUID_RE.test(documentId)) {
    return NextResponse.json({ error: "Invalid documentId" }, { status: 400 });
  }

  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Question is too long (max ${MAX_QUESTION_LENGTH} characters).` },
      { status: 400 }
    );
  }

  const safeHistory = (Array.isArray(history) ? history : [])
    .filter(
      (turn) =>
        turn &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string"
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, MAX_TURN_LENGTH) }));

  const safeLocalDateTime =
    typeof localDateTime === "string" ? localDateTime.slice(0, MAX_LOCAL_DATETIME_LENGTH) : undefined;

  const queryVector = await embedText(question);
  const matches = await queryChunks(documentId, queryVector, 5);

  const context = matches
    .map((match) => match.metadata?.text)
    .filter((text): text is string => Boolean(text))
    .join("\n\n---\n\n");

  const stream = await streamChatCompletion(context, question, safeHistory, safeLocalDateTime);

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: ChatStreamEvent) => {
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
  };

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) send(controller, { type: "delta", content: delta });

          const usage = chunk.x_groq?.usage;
          if (usage) {
            send(controller, {
              type: "usage",
              usage: {
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
              },
            });
          }
        }
      } catch (error) {
        controller.error(error);
        return;
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
