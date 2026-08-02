<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();
const { t } = useI18n();

const items = computed<NavigationMenuItem[]>(() => [
  { label: t("nav.home"), to: "/", active: route.path === "/" },
]);
</script>

<template>
  <UHeader>
    <template #left>
      <UNavigationMenu :items="items" />
    </template>

    <template #right>
      <UColorModeButton />
      <UserMenu />
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
    </template>
  </UHeader>
</template>
