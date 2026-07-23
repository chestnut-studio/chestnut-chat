<script setup lang="ts">
import { en, zh_cn } from "@nuxt/ui/locale";

const { locale } = useI18n();
const colorMode = useColorMode();
const uiLocale = computed(() => (locale.value === "zh" ? zh_cn : en));
const sonnerTheme = computed(() => (colorMode.value === "dark" ? "dark" : "light"));

const VueQueryDevtools = import.meta.dev
  ? defineAsyncComponent(() =>
      import("@tanstack/vue-query-devtools").then((module) => module.VueQueryDevtools),
    )
  : null;
</script>

<template>
  <NuxtAnnouncer />
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator />
  <UApp :locale="uiLocale" :toaster="null">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster :theme="sonnerTheme" />
  </UApp>
  <component :is="VueQueryDevtools" v-if="VueQueryDevtools" />
</template>
