<script setup lang="ts">
import { useId } from "vue";
import Label from "./label.vue";

defineProps<{ label: string; description?: string; hint?: string; required?: boolean }>();
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-2">
      <Label :for="id" :is-required="required">{{ label }}</Label>
      <span v-if="hint" class="text-caption-1-regular text-text-tertiary">{{ hint }}</span>
    </div>
    <p v-if="description" class="text-body-2-regular text-text-secondary">{{ description }}</p>
    <slot :id="id" />
  </div>
</template>
