// Dimension of the Xenova/all-MiniLM-L6-v2 embedding model.
// Lives in its own file (rather than lib/embeddings.ts) so modules that only need the
// dimension — like lib/pinecone.ts — don't transitively pull in @huggingface/transformers,
// which every route importing lib/pinecone.ts would otherwise load at module-init time.
export const EMBEDDING_DIMENSION = 384;
