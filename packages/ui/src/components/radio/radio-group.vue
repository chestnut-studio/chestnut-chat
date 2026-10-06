<script setup lang="ts">
import { RadioGroup } from "../ui/radio-group";
export interface RadioGroupProps {
  modelValue?: string;
  name?: string;
  disabled?: boolean;
}
defineProps<RadioGroupProps>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <RadioGroup
    :model-value="modelValue"
    :name="name"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', String($event))"
    ><slot
  /></RadioGroup>
</template>
