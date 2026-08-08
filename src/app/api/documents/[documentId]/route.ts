import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/lib/pinecone";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`delete:${ip}`, { limit: 20, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds);
  }

  const { documentId } = await params;

  if (!documentId || !UUID_RE.test(documentId)) {
    return NextResponse.json({ error: "Invalid documentId" }, { status: 400 });
  }

  try {
    await deleteDocument(documentId);
  } catch (error) {
    console.error("Failed to delete document from vector store:", error);
    return NextResponse.json(
      { error: "Failed to delete document data" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
