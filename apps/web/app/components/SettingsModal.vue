<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const authSession = useAuthSession();
const colorMode = useColorMode();
const { locale, locales, setLocale, t } = useI18n();

const tabs = computed(() => [
  { label: t("settings.general"), icon: "i-lucide-settings", slot: "general" as const },
  { label: t("settings.profile"), icon: "i-lucide-user", slot: "profile" as const },
  { label: t("settings.about"), icon: "i-lucide-info", slot: "about" as const },
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
</script>

<template>
  <UModal v-model:open="open" :title="$t('settings.title')" :ui="{ content: 'max-w-xl' }">
    <template #body>
      <UTabs :items="tabs" class="w-full">
        <template #general>
          <div class="space-y-4 pt-4">
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm">{{ $t("settings.appearance") }}</span>
              <USelect v-model="colorMode.preference" :items="modeOptions" class="w-40" />
            </div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm">{{ $t("settings.language") }}</span>
              <USelect v-model="language" :items="languageOptions" class="w-40" />
            </div>
          </div>
        </template>

        <template #profile>
          <div class="space-y-3 pt-4">
            <div class="flex items-center gap-3">
              <UAvatar
                :src="authSession.data?.user?.image ?? undefined"
                :alt="authSession.data?.user?.name"
              />
              <div class="min-w-0">
                <p class="truncate font-medium">{{ authSession.data?.user?.name }}</p>
                <p class="truncate text-sm text-muted">{{ authSession.data?.user?.email }}</p>
              </div>
            </div>
          </div>
        </template>

        <template #about>
          <div class="space-y-1 pt-4 text-sm text-muted">
            <p>{{ $t("app.name") }}</p>
            <p>{{ $t("settings.version") }}</p>
          </div>
        </template>
      </UTabs>
    </template>
  </UModal>
</template>
