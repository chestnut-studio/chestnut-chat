import type { Ref } from "vue";

export type BuiltinProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
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
  apiKey: string;
  baseUrl?: string;
  enabled: boolean;
  models?: readonly ProviderModel[];
  lastModelsSyncAt?: string;
}

export interface CustomProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  models?: readonly ProviderModel[];
  lastModelsSyncAt?: string;
}

interface ProvidersStorage {
  builtin: Partial<Record<BuiltinProviderId, ProviderEntry>>;
  custom: CustomProvider[];
}

const STORAGE_KEY = "chestnut-providers";

function defaultStorage(): ProvidersStorage {
  return { builtin: {}, custom: [] };
}

function readStorage(): ProvidersStorage {
  if (!import.meta.client) return defaultStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProvidersStorage) : defaultStorage();
  } catch {
    return defaultStorage();
  }
}

function writeStorage(data: ProvidersStorage) {
  if (!import.meta.client) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useProviderKeys() {
  const storage: Ref<ProvidersStorage> = ref(defaultStorage());

  onMounted(() => {
    storage.value = readStorage();
  });

  function saveBuiltin(id: BuiltinProviderId, entry: ProviderEntry) {
    storage.value = {
      ...storage.value,
      builtin: { ...storage.value.builtin, [id]: { ...entry } },
    };
    writeStorage(storage.value);
  }

  function removeBuiltin(id: BuiltinProviderId) {
    const builtin = { ...storage.value.builtin };
    delete builtin[id];
    storage.value = { ...storage.value, builtin };
    writeStorage(storage.value);
  }

  function addCustom(provider: Omit<CustomProvider, "id">): string {
    const id = crypto.randomUUID();
    const entry: CustomProvider = { ...provider, id };
    storage.value = { ...storage.value, custom: [...storage.value.custom, entry] };
    writeStorage(storage.value);
    return id;
  }

  function saveCustom(provider: CustomProvider) {
    storage.value = {
      ...storage.value,
      custom: storage.value.custom.map((p) => (p.id === provider.id ? { ...provider } : p)),
    };
    writeStorage(storage.value);
  }

  function removeCustom(id: string) {
    storage.value = {
      ...storage.value,
      custom: storage.value.custom.filter((p) => p.id !== id),
    };
    writeStorage(storage.value);
  }

  function getBuiltin(id: BuiltinProviderId): ProviderEntry {
    return storage.value.builtin[id] ?? { apiKey: "", enabled: false };
  }

  return {
    storage: readonly(storage),
    saveBuiltin,
    removeBuiltin,
    addCustom,
    saveCustom,
    removeCustom,
    getBuiltin,
  };
}
