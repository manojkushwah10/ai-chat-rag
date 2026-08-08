"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { FileTextIcon, SendIcon, MicIcon } from "./icons";
import { getMessages, saveMessages } from "@/lib/history";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import type { ChatMessage as ChatMessageType, ChatStreamEvent } from "@/types";

type Props = {
  documentId: string;
  filename: string;
};

const MAX_TEXTAREA_HEIGHT = 160;

export function ChatWindow({ documentId, filename }: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>(() => getMessages(documentId));
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
  }

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    saveMessages(documentId, messages);
  }, [documentId, messages]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }

  const speech = useSpeechRecognition({
    onTranscript: (text) => {
      setInput(text);
      requestAnimationFrame(autoResize);
    },
  });

  function toggleDictation() {
    if (speech.isListening) {
      speech.stop();
    } else {
      speech.start(input);
    }
  }

  async function streamResponse(question: string, historyBefore: ChatMessageType[]) {
    setError(null);
    const assistantId = crypto.randomUUID();
    const history = historyBefore.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const localDateTime = new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "long",
      }).format(new Date());

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question, history, localDateTime }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Chat request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event: ChatStreamEvent = JSON.parse(line);

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              if (event.type === "delta") return { ...m, content: m.content + event.content };
              return { ...m, usage: event.usage };
            })
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  }

  async function sendMessage() {
    const question = input.trim();
    if (!question || isStreaming) return;

    if (speech.isListening) speech.stop();
    setInput("");
    requestAnimationFrame(autoResize);

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    const historyBefore = messages;
    setMessages((prev) => [...prev, userMessage]);
    await streamResponse(question, historyBefore);
  }

  async function handleEditMessage(messageId: string, newContent: string) {
    if (isStreaming) return;
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;

    const historyBefore = messages.slice(0, index);
    const editedMessage: ChatMessageType = { ...messages[index], content: newContent };
    setMessages([...historyBefore, editedMessage]);
    await streamResponse(newContent, historyBefore);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-center gap-1.5 py-3 pl-12 text-xs text-muted md:pl-0">
        <FileTextIcon className="h-3.5 w-3.5" />
        <span className="max-w-xs truncate">{filename}</span>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="scrollbar-thin flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
          {messages.length === 0 && (
            <p className="pt-16 text-center text-sm text-muted">
              Ask a question about{" "}
              <span className="font-medium text-foreground">{filename}</span> to get started.
            </p>
          )}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onEdit={handleEditMessage}
              disabled={isStreaming}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        {(error || speech.error) && (
          <p className="mx-auto max-w-3xl px-4 pt-2 text-sm text-danger">
            {error || speech.error}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="mx-auto flex max-w-3xl items-end gap-2 px-4 py-4"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask something about the document…"
            rows={1}
            disabled={isStreaming}
            className="max-h-40 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent disabled:opacity-50"
          />
          {speech.isSupported && (
            <button
              type="button"
              onClick={toggleDictation}
              disabled={isStreaming}
              aria-label={speech.isListening ? "Stop voice input" : "Start voice input"}
              aria-pressed={speech.isListening}
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
                speech.isListening
                  ? "border-danger bg-danger/10 text-danger"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {speech.isListening && (
                <span className="absolute inset-0 animate-ping rounded-full bg-danger/30" />
              )}
              <MicIcon className="relative h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
