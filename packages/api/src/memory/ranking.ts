export type RankedItem<T> = {
  item: T;
  score: number;
};

/** Reciprocal rank fusion across multiple ranked lists. */
export function reciprocalRankFusion<T>(
  lists: T[][],
  options?: { k?: number; key?: (item: T) => string },
) {
  const k = options?.k ?? 60;
  const keyFn = options?.key ?? ((item: T) => String(item));
  const scores = new Map<string, { item: T; score: number }>();

  for (const list of lists) {
    list.forEach((item, index) => {
      const key = keyFn(item);
      const contribution = 1 / (k + index + 1);
      const existing = scores.get(key);
      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(key, { item, score: contribution });
      }
    });
  }

  return [...scores.values()].sort((a, b) => b.score - a.score);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
