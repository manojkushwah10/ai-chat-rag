const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function splitBySize(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

export function splitText(rawText: string): string[] {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;

    if (candidate.length <= CHUNK_SIZE) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      chunks.push(buffer);
      buffer = "";
    }

    if (paragraph.length <= CHUNK_SIZE) {
      buffer = paragraph;
    } else {
      chunks.push(...splitBySize(paragraph));
    }
  }

  if (buffer) chunks.push(buffer);

  return chunks.filter((chunk) => chunk.trim().length > 0);
}
