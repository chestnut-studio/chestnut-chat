import {
  modelReasoningEfforts,
  modelRequiresReasoning,
  modelSupportsReasoning,
  modelSupportsVision,
  type ReasoningEffort,
} from "@chestnut-chat/api/providers/model-capabilities";

import type { BuiltinProviderId, ProviderModel } from "~/composables/useProviderKeys";
import type { ProviderIconId } from "~/types/providers";

export type ChatProviderKind = "builtin" | "custom";

export interface ChatModelTarget {
  kind: ChatProviderKind;
  providerId: string;
  modelId: string;
}

export type ModelOption = {
  value: string;
  label: string;
  providerIcon: ProviderIconId;
  providerName: string;
  reasoning: boolean;
  reasoningRequired: boolean;
  reasoningEfforts: readonly ReasoningEffort[];
  vision: boolean;
};

interface ConfiguredProviderModelSource {
  kind: ChatProviderKind;
  id: string;
  name: string;
  iconProvider: ProviderIconId;
  enabled: boolean;
  models: readonly ProviderModel[];
}

const LEGACY_DEEPSEEK_MODEL_IDS = ["deepseek-v4-flash", "deepseek-v4-pro"] as const;

function encodeChatModelPart(value: string) {
  return encodeURIComponent(value);
}

function modelOptionLabel(providerName: string, model: ProviderModel) {
  return `${providerName} - ${model.name?.trim() || model.id}`;
}

export function encodeChatModelValue(target: ChatModelTarget) {
  return [
    target.kind,
    encodeChatModelPart(target.providerId),
    encodeChatModelPart(target.modelId),
  ].join(":");
}

export function decodeChatModelValue(value: string): ChatModelTarget | null {
  const [kind, providerId, modelId, ...rest] = value.split(":");
  if ((kind !== "builtin" && kind !== "custom") || !providerId || !modelId || rest.length) {
    return null;
  }

  return {
    kind,
    providerId: decodeURIComponent(providerId),
    modelId: decodeURIComponent(modelId),
  };
}

export function builtinChatModelValue(providerId: BuiltinProviderId, modelId: string) {
  return encodeChatModelValue({ kind: "builtin", providerId, modelId });
}

export const MODELS: ModelOption[] = [
  {
    value: builtinChatModelValue("openrouter", "openrouter/free"),
    label: "OpenRouter Free",
    providerIcon: "openrouter",
    providerName: "OpenRouter",
    reasoning: false,
    reasoningRequired: false,
    reasoningEfforts: [],
    vision: false,
  },
];

export const DEFAULT_MODEL =
  MODELS[0]?.value ?? builtinChatModelValue("openrouter", "openrouter/free");

export function isLegacyDeepSeekModel(value: string) {
  return LEGACY_DEEPSEEK_MODEL_IDS.includes(value as (typeof LEGACY_DEEPSEEK_MODEL_IDS)[number]);
}

export function buildProviderModelOptions(
  providers: readonly ConfiguredProviderModelSource[],
): ModelOption[] {
  const configuredOptions = providers.flatMap((provider) => {
    if (!provider.enabled) return [];

    return provider.models.map((model) => ({
      value: encodeChatModelValue({
        kind: provider.kind,
        providerId: provider.id,
        modelId: model.id,
      }),
      label: modelOptionLabel(provider.name, model),
      providerIcon: provider.iconProvider,
      providerName: provider.name,
      reasoning: modelSupportsReasoning(provider.id, model.id, model.supportsReasoning),
      reasoningRequired: modelRequiresReasoning(provider.id, model.id),
      reasoningEfforts: modelReasoningEfforts(provider.id, model.id),
      vision: modelSupportsVision(provider.id, model.id, model.supportsVision),
    }));
  });

  const configuredValues = new Set(configuredOptions.map((option) => option.value));
  return [...MODELS.filter((option) => !configuredValues.has(option.value)), ...configuredOptions];
}
