export const DEFAULT_INPUT_TOKEN_BUDGET = 24_000;
export const DEFAULT_OUTPUT_TOKEN_RESERVE = 4_000;
export const RECENT_TURN_KEEP = 8;
export const SUMMARIZE_TOKEN_THRESHOLD = 16_000;

/** Rough token estimate: ~4 chars per token for mixed CJK/Latin. */
export function estimateTokens(text: string) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export type BudgetSlice = {
  id: string;
  kind: "instructions" | "summary" | "memory" | "file" | "message";
  text: string;
  priority: number;
};

/**
 * Preserve newest message and instructions first; trim low-ranked
 * file chunks, memories, then older turns.
 */
export function trimToTokenBudget(
  slices: BudgetSlice[],
  options?: { inputBudget?: number; outputReserve?: number },
) {
  const inputBudget = options?.inputBudget ?? DEFAULT_INPUT_TOKEN_BUDGET;
  const outputReserve = options?.outputReserve ?? DEFAULT_OUTPUT_TOKEN_RESERVE;
  const budget = Math.max(1_000, inputBudget - outputReserve);

  const ordered = [...slices].sort((a, b) => a.priority - b.priority);
  const kept: BudgetSlice[] = [];
  let used = 0;

  for (const slice of ordered) {
    const tokens = estimateTokens(slice.text);
    if (used + tokens > budget && slice.kind !== "instructions") {
      continue;
    }
    kept.push(slice);
    used += tokens;
  }

  return { kept, usedTokens: used, budget };
}

export function shouldSummarize(unsummarizedTokenEstimate: number) {
  return unsummarizedTokenEstimate > SUMMARIZE_TOKEN_THRESHOLD;
}
