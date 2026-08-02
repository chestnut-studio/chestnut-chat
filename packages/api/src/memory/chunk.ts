const TARGET_CHUNK_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 200;

function findBreak(text: string, start: number, idealEnd: number, target: number) {
  const hardEnd = Math.min(text.length, idealEnd);
  if (hardEnd >= text.length) return text.length;

  const windowStart = Math.max(start + Math.floor(target * 0.6), start);
  const slice = text.slice(windowStart, hardEnd);

  const paragraph = slice.lastIndexOf("\n\n");
  if (paragraph >= 0) return windowStart + paragraph + 2;

  const sentence = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  if (sentence >= 0) return windowStart + sentence + 2;

  const space = slice.lastIndexOf(" ");
  if (space >= 0) return windowStart + space + 1;

  return hardEnd;
}

/** Deterministic paragraph/sentence-aware chunking with overlap. */
export function chunkDocument(
  text: string,
  options?: { targetChars?: number; overlapChars?: number },
) {
  const target = options?.targetChars ?? TARGET_CHUNK_CHARS;
  const overlap = options?.overlapChars ?? CHUNK_OVERLAP_CHARS;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [] as string[];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const idealEnd = start + target;
    const end = findBreak(normalized, start, idealEnd, target);
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;

    // Overlap only when it is smaller than the chunk; otherwise it would move
    // the start backwards (or stall) and loop forever.
    start = overlap > 0 && overlap < end - start ? end - overlap : end;
  }

  return chunks;
}

export function chunkOverlap(prev: string, next: string, overlapChars = CHUNK_OVERLAP_CHARS) {
  if (!prev || !next || overlapChars <= 0) return 0;
  const max = Math.min(overlapChars, prev.length, next.length);
  for (let size = max; size > 0; size -= 1) {
    if (prev.slice(-size) === next.slice(0, size)) return size;
  }
  return 0;
}
