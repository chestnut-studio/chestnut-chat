import { useProviderKeys } from "~/composables/useProviderKeys";
import { buildProviderModelOptions, decodeChatModelValue, type ModelOption } from "~/utils/models";
import { BUILTIN_PROVIDERS } from "~/utils/provider-defs";

/**
 * Resolves the configured model catalog (builtin + custom providers) into
 * selectable model options, shared by the composer and the chat header.
 */
export function useModelOptions() {
  const { storage: providerStorage, isLoading } = useProviderKeys();

  const configuredProviderModelSources = computed(() => [
    ...BUILTIN_PROVIDERS.map((def) => {
      const entry = providerStorage.value.builtin[def.id];
      return {
        kind: "builtin" as const,
        id: def.id,
        name: entry?.name?.trim() || def.name,
        iconProvider: def.id,
        enabled: !!entry?.enabled,
        models: entry?.models ?? [],
      };
    }),
    ...providerStorage.value.custom.map((provider) => ({
      kind: "custom" as const,
      id: provider.id,
      name: provider.name,
      iconProvider: "custom" as const,
      enabled: provider.enabled,
      models: provider.models ?? [],
    })),
  ]);

  const modelOptions = computed<ModelOption[]>(() =>
    buildProviderModelOptions(configuredProviderModelSources.value),
  );

  function findModelOption(value: string) {
    const exactOption = modelOptions.value.find((item) => item.value === value);
    if (exactOption) return exactOption;

    return modelOptions.value.find((item) => decodeChatModelValue(item.value)?.modelId === value);
  }

  return { modelOptions, findModelOption, isLoading };
}
