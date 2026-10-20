<script setup lang="ts">
import { ArrowUp, Check, Monitor, Moon, RotateCcw, Sparkles, Sun } from "~/utils/icons";
import { BButton } from "@chestnut-chat/ui";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@chestnut-chat/ui/components/ui/select";
import { ACCENTS } from "~/utils/theme";

const colorMode = useColorMode();
const { locale, locales, setLocale, t } = useI18n();
const { accent, reset } = useThemePreferences();

const colorModeOptions = computed(() => [
  { value: "system", label: t("settings.system"), icon: Monitor },
  { value: "light", label: t("settings.light"), icon: Sun },
  { value: "dark", label: t("settings.dark"), icon: Moon },
]);

function resetTheme() {
  reset();
  colorMode.preference = "system";
}
</script>

<template>
  <div class="mt-6 flex flex-col gap-6">
    <div
      class="divide-y divide-separator-border rounded-2xl border border-border-button-default bg-background-primary-default shadow-card"
    >
      <section class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h3 class="text-body-medium text-text-primary">{{ $t("settings.colorMode") }}</h3>
          <p class="mt-0.5 text-caption-1-regular text-text-secondary">
            {{ $t("settings.colorModeDescription") }}
          </p>
        </div>
        <ClientOnly>
          <div
            role="radiogroup"
            :aria-label="$t('settings.colorMode')"
            class="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-segmented-control-background p-1"
          >
            <button
              v-for="option in colorModeOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="colorMode.preference === option.value"
              class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-body-2-medium whitespace-nowrap text-text-secondary transition-colors outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring aria-checked:bg-segmented-control-selected-background aria-checked:text-text-primary aria-checked:shadow-card"
              @click="colorMode.preference = option.value"
            >
              <component :is="option.icon" class="size-4" />{{ option.label }}
            </button>
          </div>
        </ClientOnly>
      </section>

      <section class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h3 class="text-body-medium text-text-primary">{{ $t("settings.accent") }}</h3>
          <p class="mt-0.5 text-caption-1-regular text-text-secondary">
            {{ $t("settings.accentDescription") }}
          </p>
        </div>
        <div
          role="radiogroup"
          :aria-label="$t('settings.accent')"
          class="flex shrink-0 items-center gap-2.5 p-1"
        >
          <button
            v-for="option in ACCENTS"
            :key="option.id"
            type="button"
            role="radio"
            :aria-checked="accent === option.id"
            :aria-label="$t(`settings.accents.${option.id}`)"
            :title="$t(`settings.accents.${option.id}`)"
            class="flex size-6 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background-primary-default outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-border-focus-ring aria-checked:ring-2 aria-checked:ring-border-button-active"
            :style="{ backgroundColor: option.ramp ? option.ramp[500] : 'var(--color-blue-500)' }"
            @click="accent = option.id"
          >
            <Check v-if="accent === option.id" class="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h3 class="text-body-medium text-text-primary">{{ $t("settings.language") }}</h3>
          <p class="mt-0.5 text-caption-1-regular text-text-secondary">
            {{ $t("settings.languageDescription") }}
          </p>
        </div>
        <Select
          :model-value="locale"
          @update:model-value="
            (value) => {
              if (value === 'en' || value === 'zh') setLocale(value);
            }
          "
        >
          <SelectTrigger :aria-label="$t('settings.language')" class="w-full shrink-0 sm:w-40"
            ><SelectValue
          /></SelectTrigger>
          <SelectContent
            ><SelectGroup
              ><SelectItem v-for="item in locales" :key="item.code" :value="item.code">{{
                item.name
              }}</SelectItem></SelectGroup
            ></SelectContent
          >
        </Select>
      </section>
    </div>

    <section class="flex flex-col gap-2">
      <p class="text-caption-1-semibold text-text-secondary">{{ $t("settings.livePreview") }}</p>
      <div
        class="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-4"
      >
        <div class="flex items-center gap-2 text-body-semibold text-text-primary">
          <Sparkles class="size-4" />{{ $t("app.name") }}
        </div>
        <div
          class="ml-auto max-w-[80%] rounded-2xl bg-background-primary-default p-3 text-caption-1-regular text-text-primary"
        >
          {{ $t("settings.previewPrompt") }}
        </div>
        <p class="text-caption-1-regular text-text-primary">
          {{ $t("settings.previewResponse") }}
        </p>
        <div
          class="flex items-center gap-2 rounded-xl border border-border-button-default bg-background-primary-default p-2"
        >
          <span class="min-w-0 flex-1 truncate text-caption-1-regular text-text-placeholder">{{
            $t("settings.previewPlaceholder")
          }}</span>
          <span
            class="flex size-7 items-center justify-center rounded-lg bg-button-primary text-text-white"
            ><ArrowUp class="size-4"
          /></span>
        </div>
      </div>
    </section>

    <div class="flex items-center justify-between gap-3">
      <p class="text-caption-1-regular text-text-secondary">
        {{ $t("settings.savedAutomatically") }}
      </p>
      <BButton variant="ghost" size="small" :leading-icon="RotateCcw" @click="resetTheme">
        {{ $t("settings.resetTheme") }}
      </BButton>
    </div>
  </div>
</template>
