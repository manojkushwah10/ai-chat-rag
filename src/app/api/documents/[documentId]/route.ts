import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/lib/pinecone";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
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
