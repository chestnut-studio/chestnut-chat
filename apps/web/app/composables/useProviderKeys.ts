import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

export type BuiltinProviderId =
  | "minimax"
  | "qwen"
  | "zai"
  | "xiaomimimo"
  | "doubao"
  | "hunyuan"
  | "longcat"
  | "spark"
  | "stepfun"
  | "wenxin"
  | "kimi"
  | "deepseek"
  | "openrouter";

export interface ProviderModel {
  id: string;
  name?: string;
  ownedBy?: string;
  source: "fetched" | "manual";
}

export interface ProviderEntry {
  name?: string;
  hasApiKey: boolean;
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
  models?: readonly ProviderModel[];
  lastModelsSyncAt?: string;
}

export interface CustomProvider {
  id: string;
  name: string;
  hasApiKey: boolean;
  apiKey?: string;
  baseUrl: string;
  enabled: boolean;
  models?: readonly ProviderModel[];
  lastModelsSyncAt?: string;
}

interface ProvidersStorage {
  builtin: Partial<Record<BuiltinProviderId, ProviderEntry>>;
  custom: CustomProvider[];
}

type ProviderListItem = {
  kind: "builtin" | "custom";
  id: string;
  name: string;
  hasApiKey: boolean;
  baseUrl?: string;
  enabled: boolean;
  models: ProviderModel[];
  lastModelsSyncAt?: string;
};

type ProviderTarget = { kind: "builtin"; id: BuiltinProviderId } | { kind: "custom"; id: string };

function defaultStorage(): ProvidersStorage {
  return { builtin: {}, custom: [] };
}

function cleanApiKey(apiKey: string | undefined) {
  const trimmed = apiKey
    ?.trim()
    .replace(/^export\s+/i, "")
    .replace(/^(?:openai_api_key|minimax_api_key|minimaxi_api_key|api_key)\s*=\s*/i, "")
    .replace(/^authorization:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .trim()
    .replace(/^authorization:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
  return trimmed || undefined;
}

function requireApiKey(apiKey: string | undefined) {
  const trimmed = cleanApiKey(apiKey);
  if (!trimmed) throw new Error("API key is required.");

  return trimmed;
}

function cloneModels(models: readonly ProviderModel[] | undefined) {
  return models?.map((model) => ({ ...model })) ?? [];
}

function toStorage(items: readonly ProviderListItem[] | undefined): ProvidersStorage {
  if (!items) return defaultStorage();

  const builtin: ProvidersStorage["builtin"] = {};
  const custom: CustomProvider[] = [];

  for (const item of items) {
    const entry = {
      name: item.name,
      hasApiKey: item.hasApiKey,
      baseUrl: item.baseUrl,
      enabled: item.enabled,
      models: cloneModels(item.models),
      lastModelsSyncAt: item.lastModelsSyncAt,
    };

    if (item.kind === "builtin") {
      builtin[item.id as BuiltinProviderId] = entry;
    } else {
      custom.push({
        ...entry,
        id: item.id,
        name: item.name,
        baseUrl: item.baseUrl ?? "",
      });
    }
  }

  return { builtin, custom };
}

export function useProviderKeys() {
  const { $orpc } = useNuxtApp();
  const queryClient = useQueryClient();
  const list = useQuery($orpc.providers.list.queryOptions());
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: $orpc.providers.list.queryKey() });

  const create = useMutation({
    ...$orpc.providers.create.mutationOptions(),
    onSuccess: invalidate,
  });
  const update = useMutation({
    ...$orpc.providers.update.mutationOptions(),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    ...$orpc.providers.delete.mutationOptions(),
    onSuccess: invalidate,
  });
  const fetchModels = useMutation($orpc.providers.fetchModels.mutationOptions());

  const storage = computed(() => toStorage(list.data.value as ProviderListItem[] | undefined));

  async function saveBuiltin(id: BuiltinProviderId, entry: ProviderEntry) {
    const existing = storage.value.builtin[id];
    const apiKey = cleanApiKey(entry.apiKey);
    const models = cloneModels(entry.models);

    if (existing?.hasApiKey) {
      await update.mutateAsync({
        kind: "builtin",
        id,
        name: entry.name,
        apiKey,
        baseUrl: entry.baseUrl,
        enabled: entry.enabled,
        models,
      });
      return;
    }

    await create.mutateAsync({
      kind: "builtin",
      id,
      name: entry.name ?? id,
      apiKey: requireApiKey(entry.apiKey),
      baseUrl: entry.baseUrl,
      enabled: entry.enabled,
      models,
    });
  }

  async function removeBuiltin(id: BuiltinProviderId) {
    await remove.mutateAsync({ kind: "builtin", id });
  }

  async function addCustom(provider: Omit<CustomProvider, "id" | "hasApiKey">): Promise<string> {
    const row = await create.mutateAsync({
      kind: "custom",
      name: provider.name,
      apiKey: requireApiKey(provider.apiKey),
      baseUrl: provider.baseUrl,
      enabled: provider.enabled,
      models: cloneModels(provider.models),
    });

    return row.id;
  }

  async function saveCustom(provider: CustomProvider) {
    await update.mutateAsync({
      kind: "custom",
      id: provider.id,
      name: provider.name,
      apiKey: cleanApiKey(provider.apiKey),
      baseUrl: provider.baseUrl,
      enabled: provider.enabled,
      models: cloneModels(provider.models),
    });
  }

  async function removeCustom(id: string) {
    await remove.mutateAsync({ kind: "custom", id });
  }

  function getBuiltin(id: BuiltinProviderId): ProviderEntry {
    return storage.value.builtin[id] ?? { hasApiKey: false, enabled: false, models: [] };
  }

  async function fetchProviderModelsForTarget(target: ProviderTarget) {
    return fetchModels.mutateAsync(target);
  }

  return {
    storage,
    isLoading: list.isPending,
    isSaving: computed(
      () => create.isPending.value || update.isPending.value || remove.isPending.value,
    ),
    saveBuiltin,
    removeBuiltin,
    addCustom,
    saveCustom,
    removeCustom,
    getBuiltin,
    fetchProviderModelsForTarget,
  };
}
