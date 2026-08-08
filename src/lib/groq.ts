import Groq from "groq-sdk";

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions about a specific uploaded document.
Rules:
- Base your answers strictly on the document context provided below. Do not use outside knowledge about the document's subject matter.
- If the context does not contain enough information to answer, say so clearly instead of guessing.
- Exception: if the user asks for the current date, time, day of the week, or similar, answer using the "Current date and time" value given below instead of the document — this is real, trustworthy information, not something to refuse.
- Be concise and directly answer the question.`;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function streamChatCompletion(
  context: string,
  question: string,
  history: ChatTurn[],
  localDateTime?: string
) {
  const groq = getClient();

  return groq.chat.completions.create({
    model: MODEL,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      {
        role: "user",
        content: `Current date and time: ${localDateTime ?? "unknown"}\n\nContext from the document:\n"""\n${context}\n"""\n\nQuestion: ${question}`,
      },
    ],
  });
}
