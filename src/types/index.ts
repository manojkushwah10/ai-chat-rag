export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  usage?: TokenUsage;
};

export type ChatStreamEvent =
  | { type: "delta"; content: string }
  | { type: "usage"; usage: TokenUsage };

export type UploadResponse = {
  documentId: string;
  filename: string;
  chunkCount: number;
};

export type Conversation = {
  documentId: string;
  filename: string;
  createdAt: number;
};

export type ChatRequestBody = {
  documentId: string;
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  localDateTime?: string;
};
