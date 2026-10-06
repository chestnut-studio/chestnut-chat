<script setup lang="ts">
import { getThemeCss } from "~/utils/theme";

const colorMode = useColorMode();
const { preferences } = useThemePreferences();
const sonnerTheme = computed(() => (colorMode.value === "dark" ? "dark" : "light"));

useHead(() => ({
  htmlAttrs: { "data-theme": preferences.value.preset },
  style: [
    {
      key: "theme-preset",
      innerHTML: getThemeCss(preferences.value),
    },
  ],
}));

const VueQueryDevtools = import.meta.dev
  ? defineAsyncComponent(() =>
      import("@tanstack/vue-query-devtools").then((module) => module.VueQueryDevtools),
    )
  : null;
</script>

<template>
  <NuxtAnnouncer />
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator color="var(--primary)" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster :theme="sonnerTheme" />
  <component :is="VueQueryDevtools" v-if="VueQueryDevtools" />
</template>
