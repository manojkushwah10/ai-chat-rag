"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { SparkleIcon, UserIcon, CopyIcon, CheckIcon, PencilIcon } from "./icons";
import type { ChatMessage as ChatMessageType } from "@/types";

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

type Props = {
  message: ChatMessageType;
  onEdit?: (id: string, newContent: string) => void;
  disabled?: boolean;
};

export function ChatMessage({ message, onEdit, disabled }: Props) {
  const isUser = message.role === "user";
  const isPending = !isUser && message.content === "";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleEditSave() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit?.(message.id, trimmed);
    }
    setIsEditing(false);
  }

  return (
    <div className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-surface-2 text-foreground" : "bg-accent text-accent-foreground"
        }`}
      >
        {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <SparkleIcon className="h-3.5 w-3.5" />}
      </span>

      <div className={`flex min-w-0 max-w-[75%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {isEditing ? (
          <div className="w-full min-w-[16rem] rounded-2xl border border-accent bg-surface p-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={3}
              className="w-full resize-none bg-transparent text-sm outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDraft(message.content);
                  setIsEditing(false);
                }}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                Save & regenerate
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? "rounded-tr-sm bg-accent text-accent-foreground"
                : "rounded-tl-sm bg-surface-2 text-foreground"
            }`}
          >
            {isPending ? (
              <TypingDots />
            ) : isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-pre:my-2 prose-headings:my-2">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {!isPending && !isEditing && (
          <div className="flex items-center gap-2 px-1 text-muted">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy message"
              className="flex items-center gap-1 rounded-md p-1 text-xs opacity-60 transition-opacity hover:bg-surface-2 hover:opacity-100"
            >
              {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
            </button>
            {isUser && onEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={disabled}
                aria-label="Edit message"
                className="flex items-center gap-1 rounded-md p-1 text-xs opacity-60 transition-opacity hover:bg-surface-2 hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
              >
                <PencilIcon className="h-3 w-3" />
              </button>
            )}
            {!isUser && message.usage && (
              <span className="text-[11px]">
                {message.usage.promptTokens}+{message.usage.completionTokens} ={" "}
                {message.usage.totalTokens} tokens
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
