const GENERIC_REASONING_MODEL_PATTERN =
  /(?:^|[/_.:-])(?:reasoner|reasoning|thinking|qwq|r1|z1|x1|t1)(?:$|[/_.:-])/i;

const NON_CHAT_MODEL_PATTERN =
  /(?:^|[/_.:-])(?:audio|embedding|image|moderation|rerank|speech|tts|video)(?:$|[/_.:-])/i;

export const DEEPSEEK_REASONING_EFFORTS = ["high", "max"] as const;

export type ReasoningEffort = (typeof DEEPSEEK_REASONING_EFFORTS)[number];

function qwenModelSupportsReasoning(modelId: string) {
  if (/(?:^|[/_.:-])instruct(?:$|[/_.:-])/i.test(modelId)) return false;

  return /^qwen3(?:\.\d+)?(?:$|[/_.:-])/i.test(modelId);
}

/**
 * Resolves a model's reasoning capability from provider metadata first, then
 * falls back to conservative model-family rules for APIs that only return IDs.
 */
export function modelSupportsReasoning(
  providerId: string,
  modelId: string,
  declaredSupport?: boolean,
) {
  if (NON_CHAT_MODEL_PATTERN.test(modelId)) return false;

  const normalizedProviderId = providerId.toLowerCase();
  if (normalizedProviderId === "openrouter" && modelId.toLowerCase() === "openrouter/free") {
    return false;
  }
  if (normalizedProviderId === "deepseek") return true;
  if (declaredSupport !== undefined) return declaredSupport;
  if (GENERIC_REASONING_MODEL_PATTERN.test(modelId)) return true;

  switch (normalizedProviderId) {
    case "minimax":
      return /^minimax-m\d(?:$|[.-])/i.test(modelId);
    case "qwen":
      return qwenModelSupportsReasoning(modelId);
    case "spark":
      return /^spark-x(?:$|[.-])/i.test(modelId);
    default:
      return false;
  }
}

/**
 * Some providers expose reasoning models whose thinking cannot be disabled.
 * MiniMax documents this behavior for every M2.x model.
 */
export function modelRequiresReasoning(providerId: string, modelId: string) {
  return (
    providerId.toLowerCase() === "minimax" &&
    /^minimax-m2(?:$|\.\d+(?:-highspeed)?$)/i.test(modelId)
  );
}

export function modelReasoningEfforts(providerId: string): readonly ReasoningEffort[] {
  return providerId.toLowerCase() === "deepseek" ? DEEPSEEK_REASONING_EFFORTS : [];
}
