import type { DeepSeekLanguageModelChatOptions } from "@ai-sdk/deepseek";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";

export const DEEPSEEK_PROVIDER_ID = "deepseek";

export function deepSeekProviderOptions(
  providerId: string,
  reasoning: boolean | undefined,
  reasoningEffort: ReasoningEffort | undefined,
) {
  if (providerId !== DEEPSEEK_PROVIDER_ID) return undefined;

  return {
    deepseek: {
      thinking: { type: reasoning ? "enabled" : "disabled" },
      ...(reasoning ? { reasoningEffort: reasoningEffort ?? "high" } : {}),
    } satisfies DeepSeekLanguageModelChatOptions,
  };
}
