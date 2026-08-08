export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");

    // pdfjs-dist's automatic worker-script resolution depends on filesystem layout that
    // differs between local dev and a bundled serverless deployment; point it at the real
    // file explicitly rather than relying on that guesswork.
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    PDFParse.setWorker(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"));

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
