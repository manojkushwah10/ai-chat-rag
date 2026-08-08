import { pipeline, env, type FeatureExtractionPipeline } from "@huggingface/transformers";
import os from "os";
import path from "path";

// The library's default cache dir ("./.cache") is a relative path assuming a writable
// working directory. Serverless platforms (Vercel, etc.) only allow writes to the OS temp
// directory, so point the model cache there explicitly to avoid an EROFS/EACCES crash.
env.cacheDir = path.join(os.tmpdir(), "transformers-cache");

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline("feature-extraction", MODEL_ID);
  }
  return pipelinePromise;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const extractor = await getPipeline();
  const output = await extractor(texts, { pooling: "mean", normalize: true });

  return output.tolist() as number[][];
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
