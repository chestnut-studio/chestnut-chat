<script setup lang="ts">
const colorMode = useColorMode();
const { radius } = useThemePreferences();
const sonnerTheme = computed(() => (colorMode.value === "dark" ? "dark" : "light"));

useHead(() => ({
  style: [
    {
      key: "theme-radius",
      innerHTML: `:root { --ui-radius: ${radius.value}rem; }`,
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
  <NuxtLoadingIndicator />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster :theme="sonnerTheme" />
  <component :is="VueQueryDevtools" v-if="VueQueryDevtools" />
</template>
