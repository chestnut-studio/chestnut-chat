<script setup lang="ts">
import { provide } from "vue";
import { radioGroupKey } from "./radio-group-context";

/**
 * Wraps a set of Radios: arrow-key navigation, single selection, form value.
 * Ported from BoardUI components/base/radio/radio.tsx (MIT).
 */

export interface RadioGroupProps {
  modelValue?: string;
  name?: string;
  disabled?: boolean;
}

const props = defineProps<RadioGroupProps>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const groupName = props.name ?? `radio-group-${Math.random().toString(36).slice(2, 10)}`;

provide(radioGroupKey, {
  name: groupName,
  modelValue: () => props.modelValue,
  disabled: props.disabled ?? false,
  select: (value: string) => emit("update:modelValue", value),
});
</script>

<template>
  <div class="flex flex-col gap-2" role="radiogroup">
    <slot />
  </div>
</template>
