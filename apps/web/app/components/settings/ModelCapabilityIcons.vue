<script setup lang="ts">
import type { ProviderModel } from "~/composables/useProviderKeys";

withDefaults(
  defineProps<{
    providerId: string;
    model: ProviderModel;
    compact?: boolean;
  }>(),
  { compact: false },
);
</script>

<template>
  <ModelCapabilityTags :provider-id="providerId" :model="model" :compact="compact" />
</template>
