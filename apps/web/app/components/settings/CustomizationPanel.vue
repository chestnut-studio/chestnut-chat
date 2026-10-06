<script setup lang="ts">
import { ArrowUp, Check, Monitor, Moon, RotateCcw, Sparkles, Sun } from "lucide-vue-next";
import { Button } from "@chestnut-chat/ui/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@chestnut-chat/ui/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@chestnut-chat/ui/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@chestnut-chat/ui/components/ui/toggle-group";
import { THEME_PRESETS, THEME_RADIUS_OPTIONS } from "~/utils/theme";

const colorMode = useColorMode();
const { locale, locales, setLocale, t } = useI18n();
const { preset, radius, reset } = useThemePreferences();
const mode = computed({
  get: () => colorMode.preference,
  set: (value: string) => {
    if (value) colorMode.preference = value;
  },
});
const colorModeOptions = computed(() => [
  { value: "system", label: t("settings.system"), icon: Monitor },
  { value: "light", label: t("settings.light"), icon: Sun },
  { value: "dark", label: t("settings.dark"), icon: Moon },
]);
const themeOptions = computed(() =>
  THEME_PRESETS.map((option) => ({
    ...option,
    swatches: colorMode.value === "dark" ? option.theme.dark : option.theme.light,
  })),
);

function resetTheme() {
  reset();
  colorMode.preference = "system";
}
</script>

<template>
  <div class="mt-6 flex flex-col gap-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold">{{ $t("settings.appearance") }}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{{ $t("settings.appearanceDescription") }}</p>
      </div>
      <Button variant="ghost" size="sm" @click="resetTheme">
        <RotateCcw data-icon="inline-start" />{{ $t("settings.resetTheme") }}
      </Button>
    </div>

    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div class="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{{ $t("settings.colorMode") }}</CardTitle>
            <CardDescription>{{ $t("settings.colorModeDescription") }}</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientOnly>
              <ToggleGroup
                v-model="mode"
                type="single"
                variant="outline"
                :spacing="2"
                :aria-label="$t('settings.colorMode')"
                class="grid w-full grid-cols-3"
              >
                <ToggleGroupItem
                  v-for="option in colorModeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  <component :is="option.icon" data-icon="inline-start" />{{ option.label }}
                </ToggleGroupItem>
              </ToggleGroup>
            </ClientOnly>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{{ $t("settings.themePreset") }}</CardTitle>
            <CardDescription>{{ $t("settings.themePresetDescription") }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-6">
            <ToggleGroup
              :model-value="preset"
              type="single"
              variant="outline"
              :spacing="3"
              :aria-label="$t('settings.themePreset')"
              class="grid w-full grid-cols-2 sm:grid-cols-3"
              @update:model-value="
                (value) => {
                  if (typeof value === 'string' && value) preset = value;
                }
              "
            >
              <ToggleGroupItem
                v-for="option in themeOptions"
                :key="option.id"
                :value="option.id"
                :aria-label="option.label"
                class="h-auto min-w-0 flex-col items-stretch gap-3 p-3"
              >
                <span
                  class="flex h-16 overflow-hidden rounded-md border"
                  :style="{
                    borderColor: option.swatches.border,
                    backgroundColor: option.swatches.background,
                  }"
                  aria-hidden="true"
                >
                  <span
                    class="flex w-1/3 flex-col gap-1.5 border-r p-2"
                    :style="{
                      backgroundColor: option.swatches.sidebar,
                      borderColor: option.swatches.border,
                    }"
                  >
                    <span
                      class="h-1.5 w-full rounded-sm"
                      :style="{ backgroundColor: option.swatches.primary }"
                    />
                    <span
                      class="h-1.5 w-2/3 rounded-sm"
                      :style="{ backgroundColor: option.swatches.muted }"
                    />
                  </span>
                  <span class="flex flex-1 flex-col justify-center gap-1.5 p-2">
                    <span
                      class="h-2 w-4/5 rounded-sm"
                      :style="{ backgroundColor: option.swatches.foreground }"
                    />
                    <span
                      class="h-1.5 w-full rounded-sm"
                      :style="{ backgroundColor: option.swatches.muted }"
                    />
                    <span
                      class="h-3 w-1/2 rounded-sm"
                      :style="{ backgroundColor: option.swatches.primary }"
                    />
                  </span>
                </span>
                <span class="flex items-center justify-between gap-1">
                  <span class="truncate">{{ option.label }}</span>
                  <Check v-if="preset === option.id" aria-hidden="true" />
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
            <a
              href="https://tweakcn.com/editor/theme"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-muted-foreground underline underline-offset-4"
              >{{ $t("settings.themesFromTweakcn") }} ↗</a
            >

            <div class="flex flex-col gap-3">
              <label for="theme-radius" class="text-sm font-medium">{{
                $t("settings.radius")
              }}</label>
              <Select v-model="radius">
                <SelectTrigger id="theme-radius" class="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="preset">{{ $t("settings.presetDefault") }}</SelectItem>
                    <SelectItem
                      v-for="option in THEME_RADIUS_OPTIONS"
                      :key="option"
                      :value="String(option)"
                      >{{ option * 16 }}px</SelectItem
                    >
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p class="text-xs text-muted-foreground">{{ $t("settings.radiusDescription") }}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="flex flex-col gap-3 xl:sticky xl:top-6">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {{ $t("settings.livePreview") }}
        </p>
        <Card>
          <CardHeader
            ><CardTitle class="flex items-center gap-2"
              ><Sparkles class="size-4" />{{ $t("app.name") }}</CardTitle
            ></CardHeader
          >
          <CardContent class="flex flex-col gap-4">
            <div class="ml-6 rounded-lg bg-muted p-3 text-xs leading-5">
              {{ $t("settings.previewPrompt") }}
            </div>
            <p class="text-xs leading-5">{{ $t("settings.previewResponse") }}</p>
            <div class="flex items-center gap-2 rounded-md border p-2">
              <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{{
                $t("settings.previewPlaceholder")
              }}</span>
              <Button size="icon" :aria-label="$t('chat.send')"><ArrowUp /></Button>
            </div>
          </CardContent>
        </Card>
        <p class="text-xs text-muted-foreground">{{ $t("settings.savedAutomatically") }}</p>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ $t("settings.language") }}</CardTitle>
        <CardDescription>{{ $t("settings.languageDescription") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          :model-value="locale"
          @update:model-value="
            (value) => {
              if (value === 'en' || value === 'zh') setLocale(value);
            }
          "
        >
          <SelectTrigger :aria-label="$t('settings.language')" class="w-full sm:w-44"
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
      </CardContent>
    </Card>
  </div>
</template>
