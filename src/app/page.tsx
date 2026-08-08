"use client";

import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ChatWindow } from "@/components/ChatWindow";
import { Sidebar } from "@/components/Sidebar";
import { MenuIcon } from "@/components/icons";
import {
  useConversations,
  useActiveDocumentId,
  addConversation,
  setActiveConversation,
  deleteConversation,
} from "@/lib/history";
import type { UploadResponse } from "@/types";

export default function Home() {
  const conversations = useConversations();
  const activeId = useActiveDocumentId();
  const active = conversations.find((c) => c.documentId === activeId) ?? null;
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  function handleUploaded(doc: UploadResponse) {
    addConversation(doc);
    setSidebarOpen(false);
  }

  function handleNewChat() {
    setActiveConversation(null);
    setSidebarOpen(false);
  }

  function handleSelect(documentId: string) {
    setActiveConversation(documentId);
    setSidebarOpen(false);
  }

  async function handleDelete(documentId: string) {
    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to delete document");
    }
    deleteConversation(documentId);
  }

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          className="fixed left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted shadow-sm transition-colors hover:text-foreground md:hidden"
        >
          <MenuIcon className="h-4 w-4" />
        </button>
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight">Chat with your documents</h1>
              <p className="mt-1 text-sm text-muted">
                Upload a PDF, TXT, or Markdown file and ask questions grounded in its content.
              </p>
            </div>
            <FileUpload onUploaded={handleUploaded} />
          </div>
        ) : (
          <ChatWindow
            key={active.documentId}
            documentId={active.documentId}
            filename={active.filename}
          />
        )}
      </main>
    </div>
  );
}
