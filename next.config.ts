import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
  ],
  // onnxruntime-node's native binaries are loaded via a dynamic, platform-specific require()
  // that Next.js's automatic file tracing can miss when packaging serverless functions —
  // force-include them for the routes that actually run the embedding model.
  outputFileTracingIncludes: {
    "/api/upload": ["./node_modules/onnxruntime-node/bin/napi-v6/**/*"],
    "/api/chat": ["./node_modules/onnxruntime-node/bin/napi-v6/**/*"],
  },
};

export default nextConfig;
