# RAG Chat

Upload a document — PDF, TXT, or Markdown — and ask questions about it. Answers are grounded strictly in the document's content via retrieval-augmented generation (RAG), not the model's general knowledge, with one built-in exception for date/time questions.

## Features

- **Document upload & chat**: drag-and-drop or click to upload, then ask questions grounded in that document.
- **Multi-document history**: every uploaded document gets its own saved conversation, listed in a sidebar you can switch between. Both the conversation list and each conversation's messages persist across page reloads (in `localStorage`).
- **Streaming responses** with live token usage (prompt / completion / total) shown under each answer.
- **Voice input**: dictate your question via the browser's Web Speech API (Chrome/Edge/Safari only).
- **Edit & regenerate**: edit any of your previous messages to re-ask it — this discards the old response and everything after it, then regenerates from that point.
- **Copy** any message to your clipboard.
- **Delete a conversation** and its underlying vectors are actually removed from Pinecone, not just hidden locally.
- **Light / dark / system theme**, no flash of the wrong theme on load.
- **Local timezone awareness**: the assistant can answer "what's today's date" using your browser's actual local time, while staying restricted to the document for everything else.

## Stack

- **Framework**: Next.js (App Router, TypeScript, Tailwind CSS v4)
- **Chat model**: [Groq](https://groq.com) (`llama-3.3-70b-versatile` by default)
- **Vector store**: [Pinecone](https://www.pinecone.io) — one namespace per uploaded document
- **Embeddings**: [`@huggingface/transformers`](https://github.com/huggingface/transformers.js) running locally in Node (`Xenova/all-MiniLM-L6-v2`, 384-dim) — no embeddings API key needed
- **PDF parsing**: `pdf-parse`

## How it works

**Upload**: the file's text is extracted, split into overlapping chunks (`src/lib/chunking.ts`), embedded locally, and upserted into a Pinecone namespace keyed by a generated document ID.

**Chat**: your question is embedded the same way, used to retrieve the top-matching chunks from that document's namespace, and sent to Groq alongside a system prompt that restricts it to the retrieved context (plus your current local date/time, for that one exception). The response streams back as NDJSON (`{"type":"delta",...}` / `{"type":"usage",...}`) so token usage can ride along with the text.

**Delete**: removes the conversation from `localStorage` *and* calls `DELETE /api/documents/[documentId]`, which deletes the whole Pinecone namespace for that document.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | yes | From [console.groq.com/keys](https://console.groq.com/keys) |
| `PINECONE_API_KEY` | yes | From [app.pinecone.io](https://app.pinecone.io) |
| `PINECONE_INDEX_NAME` | no | Defaults to `rag-chat`. Created automatically on first upload if it doesn't exist. |
| `GROQ_MODEL` | no | Defaults to `llama-3.3-70b-versatile` |

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint

## Rate limiting & abuse protection

This is built for a small testing deployment, not a public production service — it calls two metered APIs (Groq, Pinecone) and runs real compute (PDF parsing, local embeddings) per request, so it's guarded against accidental or malicious overuse:

- **Rate limits** (per IP, in-memory): 5 uploads / 10 min, 20 chat messages / min, 20 deletes / min. Exceeding one returns `429` with a `Retry-After` header and a friendly error message.
- **Upload size cap**: 10MB per file, rejected before parsing.
- **Input bounds on chat**: questions are capped at 2000 characters; the conversation history sent with each request is capped to the last 40 turns, each truncated to 4000 characters — this protects against a client bypassing the UI and sending an artificially huge payload to run up token costs.
- **`documentId` validation**: requests with a malformed document ID are rejected before touching Pinecone.

The rate limiter is intentionally simple: an in-memory map, scoped to a single running process. That means it resets on every redeploy/cold start and isn't shared across multiple serverless instances of the same app — good enough to stop casual abuse during testing, not a substitute for a shared store (e.g. Upstash Redis) if this ever needs to hold up in production.

## Known limitations

- No server-side database — document/conversation metadata lives in the browser's `localStorage`, so it's per-device, not synced across devices.
- Voice input requires a browser that implements the Web Speech API (Chrome, Edge, Safari); the mic button simply doesn't render elsewhere.
- Editing a message permanently discards the conversation branch after it — there's no way to keep multiple response versions.
