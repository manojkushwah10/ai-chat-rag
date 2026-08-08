import {
  Pinecone,
  Errors,
  type Index,
  type RecordMetadata,
} from "@pinecone-database/pinecone";
import { EMBEDDING_DIMENSION } from "./embeddings";

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "rag-chat";

export type ChunkMetadata = RecordMetadata & {
  text: string;
  source: string;
  chunkIndex: number;
};

let client: Pinecone | null = null;
let indexPromise: Promise<Index<ChunkMetadata>> | null = null;

function getClient(): Pinecone {
  if (!client) {
    client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }
  return client;
}

async function ensureIndex(): Promise<Index<ChunkMetadata>> {
  const pc = getClient();
  const existing = await pc.listIndexes();
  const alreadyExists = existing.indexes?.some((idx) => idx.name === INDEX_NAME);

  if (!alreadyExists) {
    await pc.createIndex({
      name: INDEX_NAME,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
      waitUntilReady: true,
      suppressConflicts: true,
    });
  }

  return pc.index<ChunkMetadata>({ name: INDEX_NAME });
}

export function getIndex(): Promise<Index<ChunkMetadata>> {
  if (!indexPromise) {
    indexPromise = ensureIndex();
  }
  return indexPromise;
}

export async function upsertChunks(
  documentId: string,
  source: string,
  chunks: string[],
  vectors: number[][]
): Promise<void> {
  const index = await getIndex();

  const records = chunks.map((text, i) => ({
    id: `${documentId}-${i}`,
    values: vectors[i],
    metadata: { text, source, chunkIndex: i },
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    await index.upsert({
      records: records.slice(i, i + BATCH_SIZE),
      namespace: documentId,
    });
  }
}

export async function deleteDocument(documentId: string): Promise<void> {
  const index = await getIndex();
  try {
    await index.deleteNamespace(documentId);
  } catch (error) {
    if (error instanceof Errors.PineconeNotFoundError) return;
    throw error;
  }
}

export async function queryChunks(
  documentId: string,
  vector: number[],
  topK = 5
) {
  const index = await getIndex();
  const results = await index.query({
    vector,
    topK,
    namespace: documentId,
    includeMetadata: true,
  });
  return results.matches;
}
