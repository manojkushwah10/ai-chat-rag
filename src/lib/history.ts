import { useSyncExternalStore } from "react";
import type { ChatMessage, Conversation, UploadResponse } from "@/types";

const CONVERSATIONS_KEY = "rag-chat:conversations";
const ACTIVE_KEY = "rag-chat:active";
const MESSAGES_PREFIX = "rag-chat:messages:";
const CHANGE_EVENT = "rag-chat:change";

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function writeConversations(list: Conversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list));
}

export function addConversation(doc: UploadResponse) {
  const conversation: Conversation = {
    documentId: doc.documentId,
    filename: doc.filename,
    createdAt: Date.now(),
  };
  writeConversations([conversation, ...readConversations()]);
  localStorage.setItem(ACTIVE_KEY, doc.documentId);
  notify();
}

export function setActiveConversation(documentId: string | null) {
  if (documentId) localStorage.setItem(ACTIVE_KEY, documentId);
  else localStorage.removeItem(ACTIVE_KEY);
  notify();
}

export function deleteConversation(documentId: string) {
  writeConversations(readConversations().filter((c) => c.documentId !== documentId));
  localStorage.removeItem(MESSAGES_PREFIX + documentId);

  if (localStorage.getItem(ACTIVE_KEY) === documentId) {
    localStorage.removeItem(ACTIVE_KEY);
  }
  notify();
}

export function getMessages(documentId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_PREFIX + documentId);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveMessages(documentId: string, messages: ChatMessage[]) {
  localStorage.setItem(MESSAGES_PREFIX + documentId, JSON.stringify(messages));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getConversationsSnapshot(): string {
  return localStorage.getItem(CONVERSATIONS_KEY) ?? "[]";
}

function getConversationsServerSnapshot(): string {
  return "[]";
}

export function useConversations(): Conversation[] {
  const raw = useSyncExternalStore(
    subscribe,
    getConversationsSnapshot,
    getConversationsServerSnapshot
  );
  try {
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

function getActiveSnapshot(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function getActiveServerSnapshot(): string | null {
  return null;
}

export function useActiveDocumentId(): string | null {
  return useSyncExternalStore(subscribe, getActiveSnapshot, getActiveServerSnapshot);
}
