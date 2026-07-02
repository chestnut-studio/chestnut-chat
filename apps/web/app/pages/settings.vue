<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ["auth"],
});

const { $authClient } = useNuxtApp();
const authSession = useAuthSession();
const colorMode = useColorMode();
const toast = useToast();
const { locale, locales, setLocale, t } = useI18n();

const tabs = computed(() => [
  { label: t("settings.account"), slot: "account" as const },
  { label: t("settings.customization"), slot: "customization" as const },
  { label: t("settings.providers"), slot: "providers" as const },
  { label: t("settings.about"), slot: "about" as const },
]);

const modeOptions = computed(() => [
  { label: t("settings.system"), value: "system" },
  { label: t("settings.light"), value: "light" },
  { label: t("settings.dark"), value: "dark" },
]);

const languageOptions = computed(() =>
  (locales.value as { code: string; name: string }[]).map((item) => ({
    label: item.name,
    value: item.code,
  })),
);

const language = computed({
  get: () => locale.value,
  set: (value: string) => setLocale(value as "en" | "zh"),
});

const deleteConfirmOpen = shallowRef(false);

async function signOut() {
  await $authClient.signOut({
    fetchOptions: {
      onSuccess: async () => {
        authSession.clear();
        toast.add({ title: t("toast.signedOut") });
        await navigateTo("/", { replace: true, external: true });
      },
      onError: (error) => {
        toast.add({ title: t("toast.signOutFailed"), description: error?.error?.message });
      },
    },
  });
}
</script>

<template>
  <div class="bg-muted/30 min-h-screen">
    <div class="border-default border-b bg-background">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <UButton
          to="/"
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          :label="$t('settings.backToChat')"
        />
        <div class="flex items-center gap-2">
          <UColorModeButton />
          <UButton
            variant="ghost"
            color="neutral"
            :label="$t('settings.signOut')"
            @click="signOut"
          />
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-6xl px-6 py-10">
      <div class="flex gap-10">
        <aside class="w-56 shrink-0">
          <div class="flex flex-col items-center gap-3 text-center">
            <UAvatar
              :src="authSession.data?.user?.image ?? undefined"
              :alt="authSession.data?.user?.name"
              size="3xl"
            />
            <div>
              <p class="text-lg font-semibold">{{ authSession.data?.user?.name }}</p>
              <p class="text-muted text-sm">{{ authSession.data?.user?.email }}</p>
            </div>
          </div>
        </aside>

        <main class="min-w-0 flex-1">
          <UTabs :items="tabs" class="w-full">
            <template #account>
              <div class="mt-6 space-y-8">
                <section>
                  <h2 class="mb-4 text-xl font-semibold">{{ $t("settings.securityOptions") }}</h2>
                  <div class="border-default rounded-lg border p-4">
                    <h3 class="font-medium">{{ $t("settings.dangerZone") }}</h3>
                    <p class="text-muted mt-1 text-sm">
                      {{ $t("settings.deleteAccountDescription") }}
                    </p>
                    <UButton
                      class="mt-3"
                      color="error"
                      variant="soft"
                      :label="$t('settings.deleteAccount')"
                      @click="
                        () => {
                          deleteConfirmOpen = true;
                        }
                      "
                    />
                  </div>
                </section>
              </div>
            </template>

            <template #customization>
              <div class="mt-6 space-y-6">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="font-medium">{{ $t("settings.appearance") }}</p>
                    <p class="text-muted text-sm">{{ $t("settings.appearanceDescription") }}</p>
                  </div>
                  <USelect v-model="colorMode.preference" :items="modeOptions" class="w-40" />
                </div>
                <USeparator />
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="font-medium">{{ $t("settings.language") }}</p>
                    <p class="text-muted text-sm">{{ $t("settings.languageDescription") }}</p>
                  </div>
                  <USelect v-model="language" :items="languageOptions" class="w-40" />
                </div>
              </div>
            </template>

            <template #providers>
              <SettingsProvidersPanel />
            </template>

            <template #about>
              <div class="mt-6 space-y-4">
                <div class="border-default space-y-2 rounded-lg border p-4">
                  <div class="flex items-center justify-between">
                    <span class="text-muted text-sm">{{ $t("settings.appName") }}</span>
                    <span class="text-sm font-medium">{{ $t("app.name") }}</span>
                  </div>
                  <USeparator />
                  <div class="flex items-center justify-between">
                    <span class="text-muted text-sm">{{ $t("settings.version") }}</span>
                    <span class="text-sm font-medium">v0.1.0</span>
                  </div>
                </div>
              </div>
            </template>
          </UTabs>
        </main>
      </div>
    </div>

    <UModal
      v-model:open="deleteConfirmOpen"
      :title="$t('settings.deleteAccount')"
      :description="$t('settings.deleteAccountDescription')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton color="neutral" variant="outline" :label="$t('actions.cancel')" @click="close" />
        <UButton color="error" :label="$t('settings.deleteAccount')" />
      </template>
    </UModal>
  </div>
</template>
