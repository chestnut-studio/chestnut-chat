<script setup lang="ts">
import { VueQueryDevtools } from "@tanstack/vue-query-devtools";
import { en, zh_cn } from "@nuxt/ui/locale";

const { locale } = useI18n();
const uiLocale = computed(() => (locale.value === "zh" ? zh_cn : en));
</script>

<template>
  <NuxtAnnouncer />
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator />
  <UApp :locale="uiLocale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
  <VueQueryDevtools />
</template>
