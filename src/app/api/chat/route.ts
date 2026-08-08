import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { queryChunks } from "@/lib/pinecone";
import { streamChatCompletion } from "@/lib/groq";
import type { ChatRequestBody, ChatStreamEvent } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body: ChatRequestBody = await req.json();
  const { documentId, question, history, localDateTime } = body;

  if (!documentId || !question?.trim()) {
    return NextResponse.json(
      { error: "documentId and question are required" },
      { status: 400 }
    );
  }

  const queryVector = await embedText(question);
  const matches = await queryChunks(documentId, queryVector, 5);

  const context = matches
    .map((match) => match.metadata?.text)
    .filter((text): text is string => Boolean(text))
    .join("\n\n---\n\n");

  const stream = await streamChatCompletion(context, question, history ?? [], localDateTime);

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
