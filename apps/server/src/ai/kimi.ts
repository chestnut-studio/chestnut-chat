import {
  isKimiK25Model,
  isKimiK26Model,
  isKimiK27CodeModel,
  isKimiK3Model,
  type ReasoningEffort,
} from "@chestnut-chat/api/providers/model-capabilities";

type RequestBody = Record<string, unknown>;

export const KIMI_PROVIDER_ID = "kimi";

const KIMI_REASONING_EFFORTS = new Set<ReasoningEffort>(["low", "high", "max"]);

function stripUndefined(body: RequestBody): RequestBody {
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

function isKimiThinkingModel(modelId: string) {
  return (
    isKimiK3Model(modelId) ||
    isKimiK27CodeModel(modelId) ||
    isKimiK26Model(modelId) ||
    isKimiK25Model(modelId) ||
    /^kimi-k2\.(?:[5-9]|\d{2,})(?:$|[.-])/i.test(modelId)
  );
}

function resolveKimiReasoningEffort(effort: ReasoningEffort | undefined): ReasoningEffort {
  return effort && KIMI_REASONING_EFFORTS.has(effort) ? effort : "max";
}

function thinkingDisabled(body: RequestBody) {
  const thinking = body.thinking;
  if (!thinking || typeof thinking !== "object") return false;
  return (thinking as { type?: unknown }).type === "disabled";
}

/**
 * Build Kimi chat providerOptions.
 *
 * - kimi-k3: always thinks; top-level reasoning_effort via `reasoningEffort`
 * - kimi-k2.7-code: always thinks; omit thinking (illegal values error)
 * - kimi-k2.6: thinking.type + thinking.keep ("all" when enabled for preserved thinking)
 * - kimi-k2.5: thinking.type only
 */
export function kimiProviderOptions(
  providerId: string,
  modelId: string,
  reasoning: boolean | undefined,
  reasoningEffort: ReasoningEffort | undefined,
) {
  if (providerId.toLowerCase() !== KIMI_PROVIDER_ID) return undefined;

  if (isKimiK3Model(modelId)) {
    return {
      kimi: {
        reasoningEffort: resolveKimiReasoningEffort(reasoningEffort),
      },
    };
  }

  // Always-on thinking; do not send thinking (docs: omit or only enabled/all).
  if (isKimiK27CodeModel(modelId)) return undefined;

  if (isKimiK26Model(modelId)) {
    if (!reasoning) {
      return {
        kimi: {
          thinking: { type: "disabled" },
        },
      };
    }

    return {
      kimi: {
        thinking: { type: "enabled", keep: "all" },
      },
    };
  }

  if (isKimiK25Model(modelId) || isKimiThinkingModel(modelId)) {
    return {
      kimi: {
        thinking: { type: reasoning ? "enabled" : "disabled" },
      },
    };
  }

  return undefined;
}

/**
 * Kimi thinking models fix sampling params; sending overrides can error.
 * Also prefer max_tokens (Moonshot) over max_completion_tokens.
 */
export function transformKimiChatRequestBody(body: RequestBody): RequestBody {
  const modelId = typeof body.model === "string" ? body.model : "";
  const omitSampling =
    isKimiThinkingModel(modelId) && !thinkingDisabled(body);

  return stripUndefined({
    model: body.model,
    messages: body.messages,
    max_tokens: body.max_tokens ?? body.max_completion_tokens,
    temperature: omitSampling ? undefined : body.temperature,
    top_p: omitSampling ? undefined : body.top_p,
    presence_penalty: omitSampling ? undefined : body.presence_penalty,
    frequency_penalty: omitSampling ? undefined : body.frequency_penalty,
    tools: body.tools,
    tool_choice: body.tool_choice,
    thinking: body.thinking,
    reasoning_effort: body.reasoning_effort,
    stream: body.stream,
    stream_options: body.stream_options,
  });
}
