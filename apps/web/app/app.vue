<script setup lang="ts">
import { VueQueryDevtools } from "@tanstack/vue-query-devtools";
import { en, zh_cn } from "@nuxt/ui/locale";

const { locale } = useI18n();
const colorMode = useColorMode();
const uiLocale = computed(() => (locale.value === "zh" ? zh_cn : en));
const sonnerTheme = computed(() => (colorMode.value === "dark" ? "dark" : "light"));
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
  <VueQueryDevtools />
</template>
