import type { ProviderCredits } from "@chestnut-chat/api/providers/credits";

import type { SettingsProviderCard } from "~/types/providers";

export type ProviderCreditsState = "idle" | "loading" | "success" | "error" | "unsupported";

export interface ProviderCreditsEntry {
  state: ProviderCreditsState;
  credits?: ProviderCredits;
}

function targetKey(provider: SettingsProviderCard) {
  return `${provider.kind}:${provider.id}`;
}

export function useProviderCredits() {
  const { $orpc } = useNuxtApp();
  const creditsByProvider = shallowRef<Record<string, ProviderCreditsEntry>>({});
  const isLoadingCredits = shallowRef(false);
  const hasLoadedCredits = shallowRef(false);

  async function loadProviderCredits() {
    if (isLoadingCredits.value) return;

    isLoadingCredits.value = true;
    try {
      const results = await $orpc.providers.fetchCredits.call();
      const next: Record<string, ProviderCreditsEntry> = {};

      for (const result of results) {
        const key = `${result.kind}:${result.id}`;
        const credits = result.credits;

        if (!credits.supported) {
          next[key] = { state: "unsupported" };
          continue;
        }

        if (credits.error) {
          next[key] = { state: "error", credits };
          continue;
        }

        next[key] = { state: "success", credits };
      }

      creditsByProvider.value = next;
      hasLoadedCredits.value = true;
    } catch {
      creditsByProvider.value = {};
      hasLoadedCredits.value = true;
    } finally {
      isLoadingCredits.value = false;
    }
  }

  function creditsForProvider(provider: SettingsProviderCard): ProviderCreditsEntry {
    const key = targetKey(provider);
    if (isLoadingCredits.value && !hasLoadedCredits.value) {
      return { state: "loading" };
    }

    return creditsByProvider.value[key] ?? { state: "idle" };
  }

  return {
    isLoadingCredits,
    hasLoadedCredits,
    loadProviderCredits,
    creditsForProvider,
  };
}
