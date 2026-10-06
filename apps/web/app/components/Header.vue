<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();

const items = computed(() => [{ label: t("nav.home"), to: "/", active: route.path === "/" }]);
</script>

<template>
  <header
    class="flex h-16 items-center justify-between border-b border-separator-border px-4 sm:px-6"
  >
    <nav class="flex items-center gap-2">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="rounded-lg px-3 py-2 text-body-medium transition-colors hover:bg-background-secondary-hover"
        :class="item.active ? 'text-accent-600' : 'text-text-secondary'"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
    <div class="flex items-center gap-2">
      <BColorModeButton />
      <UserMenu />
    </div>
  </header>
</template>
