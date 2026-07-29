const SENSITIVE_PATTERNS = [
  /password\s*[:=]/i,
  /api[_\s-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /bearer\s+[a-z0-9._-]+/i,
  /\b\d{6}\b/,
  /auth(?:entication)?\s*code/i,
  /one[_\s-]?time\s*(?:password|code|token)/i,
];

const TRANSIENT_PATTERNS = [
  /^(what|who|when|where|how|why)\b/i,
  /\b(right now|today only|this once|just this)\b/i,
  /\b(translate|summarize|rewrite)\b/i,
];

/** First-person / remember-me cues that usually imply durable memory. */
const DURABLE_FACT_PATTERNS = [
  /我[是叫在会能]|我的名字|我喜欢|我偏好|我住在|请记住|记住我|帮我记住/i,
  /\b(?:i am|i'm|my name is|i prefer|i work|i live|i use|remember (?:that|this|me))\b/i,
];

export type ExtractedMemoryCandidate = {
  memoryKey: string;
  memoryType: "fact" | "preference" | "goal" | "decision" | "constraint";
  content: string;
  importance?: number;
};

export function containsSensitiveData(text: string) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

export function looksTransient(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 12) return true;
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Heuristic: user text looks like it contains durable personal facts worth extracting. */
export function transcriptLikelyHasDurableFacts(userText: string) {
  const trimmed = userText.trim();
  if (!trimmed || looksTransient(trimmed) || containsSensitiveData(trimmed)) return false;
  return DURABLE_FACT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function filterMemoryCandidates(candidates: ExtractedMemoryCandidate[], limit = 5) {
  const accepted: ExtractedMemoryCandidate[] = [];
  const seenKeys = new Set<string>();

  for (const candidate of candidates) {
    const key = candidate.memoryKey.trim().toLowerCase();
    const content = candidate.content.trim();
    if (!key || !content) continue;
    if (seenKeys.has(key)) continue;
    if (containsSensitiveData(content) || containsSensitiveData(key)) continue;
    if (looksTransient(content)) continue;

    seenKeys.add(key);
    accepted.push({
      ...candidate,
      memoryKey: key,
      content,
      importance: Math.min(1, Math.max(0, candidate.importance ?? 0.5)),
    });
    if (accepted.length >= limit) break;
  }

  return accepted;
}

/** Prefer newest item when grouping by memory key. */
export function preferNewestByKey<T extends { memoryKey: string; createdAt: Date | string }>(
  items: T[],
) {
  const byKey = new Map<string, T>();
  for (const item of items) {
    const existing = byKey.get(item.memoryKey);
    if (!existing) {
      byKey.set(item.memoryKey, item);
      continue;
    }
    const existingTime = new Date(existing.createdAt).getTime();
    const nextTime = new Date(item.createdAt).getTime();
    if (nextTime >= existingTime) byKey.set(item.memoryKey, item);
  }
  return [...byKey.values()];
}
