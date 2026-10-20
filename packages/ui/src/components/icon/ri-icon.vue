<script setup lang="ts">
import { resolveComponent } from "vue";

defineProps<{ name: string }>();

// Nuxt Icon registers `Icon` globally; resolving it at runtime keeps this
// package free of a Nuxt build-time dependency.
const Icon = resolveComponent("Icon");
</script>

<template>
  <component :is="Icon" :name="`ri:${name}`" aria-hidden="true" />
</template>
