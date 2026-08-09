import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
  ],
  // onnxruntime-node's native binaries and pdfjs-dist's worker scripts are both loaded via
  // dynamic, non-static require()/import() calls that Next.js's automatic file tracing can
  // miss when packaging serverless functions — force-include them for the routes that need
  // them (embeddings run in both upload and chat; PDF parsing only in upload).
  outputFileTracingIncludes: {
    "/api/upload": [
      "./node_modules/onnxruntime-node/bin/napi-v6/**/*",
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/**/*",
    ],
    "/api/chat": ["./node_modules/onnxruntime-node/bin/napi-v6/**/*"],
  },
};

export default nextConfig;
