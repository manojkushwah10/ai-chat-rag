import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { extractText } from "@/lib/parsers";
import { splitText } from "@/lib/chunking";
import { embedTexts } from "@/lib/embeddings";
import { upsertChunks } from "@/lib/pinecone";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit";
import type { UploadResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`upload:${ip}`, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds);
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. The limit is 10MB." },
      { status: 413 }
    );
  }

  let text: string;
  try {
    text = await extractText(file);
  } catch {
    return NextResponse.json(
      { error: "Unsupported or unreadable file type. Use PDF, TXT, or MD." },
      { status: 400 }
    );
  }

  const chunks = splitText(text);
  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "No extractable text found in the document." },
      { status: 400 }
    );
  }

  const vectors = await embedTexts(chunks);
  const documentId = randomUUID();
  await upsertChunks(documentId, file.name, chunks, vectors);

  const response: UploadResponse = {
    documentId,
    filename: file.name,
    chunkCount: chunks.length,
  };
  return NextResponse.json(response);
}
