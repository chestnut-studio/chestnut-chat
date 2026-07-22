const GENERIC_REASONING_MODEL_PATTERN =
  /(?:^|[/_.:-])(?:reasoner|reasoning|thinking|qwq|r1|z1|x1|t1)(?:$|[/_.:-])/i;

const NON_CHAT_MODEL_PATTERN =
  /(?:^|[/_.:-])(?:audio|embedding|image|moderation|rerank|speech|tts|video)(?:$|[/_.:-])/i;

const KIMI_CODE_MODEL_PATTERN = /(?:^|[/_.:-])code(?:$|[/_.:-])/i;

export const DEEPSEEK_REASONING_EFFORTS = ["high", "max"] as const;
export const KIMI_REASONING_EFFORTS = ["low", "high", "max"] as const;
export const REASONING_EFFORTS = ["low", "high", "max"] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

function qwenModelSupportsReasoning(modelId: string) {
  if (/(?:^|[/_.:-])instruct(?:$|[/_.:-])/i.test(modelId)) return false;

  return /^qwen3(?:\.\d+)?(?:$|[/_.:-])/i.test(modelId);
}

export function isKimiK3Model(modelId: string) {
  return /^kimi-k3(?:$|[.-])/i.test(modelId);
}

/** kimi-k2.7-code (+ highspeed) always reasons; other *code* IDs do not. */
export function isKimiK27CodeModel(modelId: string) {
  return /^kimi-k2\.7-code(?:$|[.-])/i.test(modelId);
}

export function isKimiK26Model(modelId: string) {
  return /^kimi-k2\.6(?:$|[.-])/i.test(modelId);
}

export function isKimiK25Model(modelId: string) {
  return /^kimi-k2\.5(?:$|[.-])/i.test(modelId);
}

/** Kimi K2.5+ / K3 / K2.7-code support thinking; classic moonshot-v1 and other code IDs do not. */
function kimiModelSupportsReasoning(modelId: string) {
  if (/^moonshot-v1/i.test(modelId)) return false;
  if (isKimiK27CodeModel(modelId)) return true;
  if (KIMI_CODE_MODEL_PATTERN.test(modelId)) return false;
  if (isKimiK3Model(modelId)) return true;
  if (/^kimi-k2\.(?:[5-9]|\d{2,})(?:$|[.-])/i.test(modelId)) return true;
  return GENERIC_REASONING_MODEL_PATTERN.test(modelId);
}

/**
 * Kimi multimodal chat models accept image input. Code-only variants and
 * non-vision moonshot-v1 IDs do not. Prefer API `supports_image_in` when set.
 */
function kimiModelSupportsVision(modelId: string) {
  if (/-vision(?:$|[.-])/i.test(modelId)) return true;
  if (/^moonshot-v1/i.test(modelId)) return false;
  if (KIMI_CODE_MODEL_PATTERN.test(modelId)) return false;
  if (isKimiK3Model(modelId)) return true;
  if (/^kimi-k2\.(?:[5-9]|\d{2,})(?:$|[.-])/i.test(modelId)) return true;
  return false;
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
    case "kimi":
      return kimiModelSupportsReasoning(modelId);
    default:
      return false;
  }
}

/**
 * Resolves vision (image input) support from provider metadata, then family rules.
 * Video-only capabilities are intentionally ignored.
 */
export function modelSupportsVision(
  providerId: string,
  modelId: string,
  declaredSupport?: boolean,
) {
  if (NON_CHAT_MODEL_PATTERN.test(modelId) && !/-vision(?:$|[.-])/i.test(modelId)) {
    return false;
  }

  if (declaredSupport !== undefined) return declaredSupport;

  const normalizedProviderId = providerId.toLowerCase();
  switch (normalizedProviderId) {
    case "deepseek":
      // Hosted DeepSeek chat models are text-only; Janus vision is not on this API.
      return false;
    case "kimi":
      return kimiModelSupportsVision(modelId);
    default:
      return false;
  }
}

/**
 * Some providers expose reasoning models whose thinking cannot be disabled.
 * MiniMax documents this for every M2.x model; Kimi for K3 and K2.7-code.
 */
export function modelRequiresReasoning(providerId: string, modelId: string) {
  const normalizedProviderId = providerId.toLowerCase();

  if (
    normalizedProviderId === "minimax" &&
    /^minimax-m2(?:$|\.\d+(?:-highspeed)?$)/i.test(modelId)
  ) {
    return true;
  }

  if (normalizedProviderId === "kimi") {
    return isKimiK3Model(modelId) || isKimiK27CodeModel(modelId);
  }

  return false;
}

export function modelReasoningEfforts(
  providerId: string,
  modelId?: string,
): readonly ReasoningEffort[] {
  const normalizedProviderId = providerId.toLowerCase();

  if (normalizedProviderId === "deepseek") return DEEPSEEK_REASONING_EFFORTS;
  if (normalizedProviderId === "kimi" && modelId && isKimiK3Model(modelId)) {
    return KIMI_REASONING_EFFORTS;
  }

  return [];
}
