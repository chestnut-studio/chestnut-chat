<script setup lang="ts">
import { NEUTRAL_THEME_COLORS, PRIMARY_THEME_COLORS, THEME_RADIUS_OPTIONS } from "~/utils/theme";

const colorMode = useColorMode();
const { locale, locales, setLocale, t } = useI18n();
const { primary, neutral, radius, reset } = useThemePreferences();

const colorModeOptions = computed(() => [
  {
    label: t("settings.system"),
    description: t("settings.systemDescription"),
    value: "system",
    icon: "i-lucide-monitor",
  },
  {
    label: t("settings.light"),
    description: t("settings.lightDescription"),
    value: "light",
    icon: "i-lucide-sun",
  },
  {
    label: t("settings.dark"),
    description: t("settings.darkDescription"),
    value: "dark",
    icon: "i-lucide-moon",
  },
]);

const primaryOptions = computed(() =>
  PRIMARY_THEME_COLORS.map((option) => ({
    ...option,
    label: t(`settings.colors.${option.value}`),
  })),
);

const neutralOptions = computed(() =>
  NEUTRAL_THEME_COLORS.map((option) => ({
    ...option,
    label: t(`settings.colors.${option.value}`),
  })),
);

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

function setColorMode(value: string) {
  colorMode.preference = value;
}

function resetTheme() {
  reset();
  colorMode.preference = "system";
}
</script>

<template>
  <div class="mt-6 space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-highlighted">{{ $t("settings.appearance") }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $t("settings.appearanceDescription") }}</p>
      </div>
      <UButton
        icon="i-lucide-rotate-ccw"
        color="neutral"
        variant="ghost"
        size="sm"
        :label="$t('settings.resetTheme')"
        @click="resetTheme"
      />
    </div>

    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div class="space-y-6">
        <UCard>
          <div>
            <h3 class="font-medium text-highlighted">{{ $t("settings.colorMode") }}</h3>
            <p class="mt-1 text-sm text-muted">{{ $t("settings.colorModeDescription") }}</p>
          </div>

          <ClientOnly>
            <div class="mt-4 grid gap-2 sm:grid-cols-3" role="group">
              <button
                v-for="option in colorModeOptions"
                :key="option.value"
                type="button"
                class="flex items-start gap-3 rounded-md border bg-default p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                :class="
                  colorMode.preference === option.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-default hover:border-accented hover:bg-elevated'
                "
                :aria-pressed="colorMode.preference === option.value"
                @click="setColorMode(option.value)"
              >
                <span
                  class="flex size-8 shrink-0 items-center justify-center rounded-md"
                  :class="
                    colorMode.preference === option.value
                      ? 'bg-primary text-inverted'
                      : 'bg-elevated text-muted'
                  "
                >
                  <UIcon :name="option.icon" class="size-4" />
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-highlighted">{{ option.label }}</span>
                  <span class="mt-0.5 block text-xs leading-4 text-muted">
                    {{ option.description }}
                  </span>
                </span>
              </button>
            </div>
            <template #fallback>
              <div class="mt-4 grid gap-2 sm:grid-cols-3">
                <USkeleton v-for="index in 3" :key="index" class="h-[74px] rounded-md" />
              </div>
            </template>
          </ClientOnly>
        </UCard>

        <UCard>
          <div class="space-y-7">
            <SettingsThemeColorSelector
              v-model="primary"
              :title="$t('settings.primaryColor')"
              :description="$t('settings.primaryColorDescription')"
              :options="primaryOptions"
            />

            <USeparator />

            <SettingsThemeColorSelector
              v-model="neutral"
              variant="palette"
              :title="$t('settings.neutralColor')"
              :description="$t('settings.neutralColorDescription')"
              :options="neutralOptions"
            />

            <USeparator />

            <fieldset>
              <legend class="font-medium text-highlighted">{{ $t("settings.radius") }}</legend>
              <p class="mt-1 text-sm text-muted">{{ $t("settings.radiusDescription") }}</p>
              <div class="mt-4 grid grid-cols-5 gap-2">
                <button
                  v-for="option in THEME_RADIUS_OPTIONS"
                  :key="option"
                  type="button"
                  class="flex min-w-0 flex-col items-center gap-2 rounded-md border bg-default px-2 py-3 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                  :class="
                    radius === option
                      ? 'border-primary text-primary ring-1 ring-primary'
                      : 'border-default text-muted hover:border-accented hover:bg-elevated'
                  "
                  :aria-label="`${option * 16} px`"
                  :aria-pressed="radius === option"
                  @click="radius = option"
                >
                  <span
                    class="h-6 w-9 border-2 border-current"
                    :style="{ borderRadius: `${option}rem` }"
                  />
                  <span>{{ option * 16 }}px</span>
                </button>
              </div>
            </fieldset>
          </div>
        </UCard>
      </div>

      <div class="xl:sticky xl:top-6">
        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          {{ $t("settings.livePreview") }}
        </p>
        <div class="overflow-hidden rounded-lg border border-default bg-default shadow-sm">
          <div class="flex items-center gap-1.5 border-b border-default bg-elevated px-4 py-3">
            <span class="size-2 rounded-full bg-error" />
            <span class="size-2 rounded-full bg-warning" />
            <span class="size-2 rounded-full bg-success" />
            <span class="ml-2 text-xs font-medium text-muted">{{ $t("app.name") }}</span>
          </div>
          <div class="space-y-4 p-4">
            <div class="ml-8 rounded-lg bg-elevated p-3 text-xs leading-5 text-default">
              {{ $t("settings.previewPrompt") }}
            </div>
            <div class="flex gap-2.5">
              <div
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              >
                <UIcon name="i-lucide-sparkles" class="size-3.5" />
              </div>
              <p class="pt-1 text-xs leading-5 text-default">
                {{ $t("settings.previewResponse") }}
              </p>
            </div>
            <div class="flex items-center gap-2 rounded-md border border-default bg-default p-2">
              <span class="min-w-0 flex-1 truncate pl-1 text-xs text-dimmed">
                {{ $t("settings.previewPlaceholder") }}
              </span>
              <UButton icon="i-lucide-arrow-up" size="xs" square :aria-label="$t('chat.send')" />
            </div>
          </div>
        </div>
        <p class="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-cloud-check" class="size-3.5 text-success" />
          {{ $t("settings.savedAutomatically") }}
        </p>
      </div>
    </div>

    <UCard>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="font-medium text-highlighted">{{ $t("settings.language") }}</h3>
          <p class="mt-1 text-sm text-muted">{{ $t("settings.languageDescription") }}</p>
        </div>
        <USelect v-model="language" :items="languageOptions" class="w-full sm:w-44" />
      </div>
    </UCard>
  </div>
</template>
