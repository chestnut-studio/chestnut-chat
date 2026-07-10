<script setup lang="ts">
import type { ProviderIconId } from "~/types/providers";

defineProps<{
  icon: ProviderIconId;
}>();
</script>

<template>
  <ProviderIcon :provider="icon" size="sm" variant="glyph" />
</template>
