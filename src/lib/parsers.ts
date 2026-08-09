export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");

    // In Node.js, pdfjs-dist never spins up a real Worker thread — it falls back to a
    // "fake worker" that dynamically imports its own worker script by path at runtime.
    // Bundlers (Turbopack in dev, webpack in serverless builds) intercept that dynamic
    // import and rewrite it in ways the runtime path string can't satisfy. Statically
    // importing the worker module ourselves and registering it as the well-known global
    // short-circuits that lookup entirely, since pdfjs checks for it before ever
    // attempting the dynamic import.
    const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return await file.text();
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}
