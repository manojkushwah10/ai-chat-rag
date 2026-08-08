"use client";

import { useState } from "react";
import { PlusIcon, FileTextIcon, TrashIcon, XIcon, SparkleIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import type { Conversation } from "@/types";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (documentId: string) => void;
  onDelete: (documentId: string) => Promise<void>;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
};

function formatRelativeTime(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNewChat,
  isOpen,
  onClose,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(documentId: string) {
    setError(null);
    setDeletingId(documentId);
    try {
      await onDelete(documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete conversation");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <SparkleIcon className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">RAG Chat</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 md:hidden"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            <PlusIcon className="h-4 w-4" />
            New chat
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-3">
          {conversations.length === 0 ? (
            <p className="px-2 pt-4 text-center text-xs text-muted">No conversations yet</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {conversations.map((c) => {
                const isActive = c.documentId === activeId;
                const isDeleting = deletingId === c.documentId;
                return (
                  <li key={c.documentId}>
                    <div
                      className={`group flex items-center gap-1 rounded-lg px-1 py-1 transition-colors ${
                        isActive ? "bg-accent/10" : "hover:bg-surface-2"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(c.documentId)}
                        disabled={isDeleting}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1 text-left disabled:opacity-50"
                      >
                        <FileTextIcon
                          className={`h-4 w-4 shrink-0 ${isActive ? "text-accent" : "text-muted"}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-sm ${
                              isActive ? "font-medium text-foreground" : "text-foreground/90"
                            }`}
                          >
                            {c.filename}
                          </span>
                          <span className="block text-[11px] text-muted">
                            {formatRelativeTime(c.createdAt)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(c.documentId);
                        }}
                        disabled={isDeleting}
                        aria-label={`Delete ${c.filename}`}
                        className="shrink-0 rounded-md p-1.5 text-muted opacity-60 transition-opacity hover:bg-surface hover:text-danger hover:opacity-100 disabled:opacity-100"
                      >
                        {isDeleting ? (
                          <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                        ) : (
                          <TrashIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && <p className="border-t border-border px-3 py-2 text-xs text-danger">{error}</p>}

        <div className="flex shrink-0 items-center justify-between border-t border-border px-3 py-3">
          <span className="text-xs text-muted">Appearance</span>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
