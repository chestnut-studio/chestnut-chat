<script setup lang="ts">
import { useId } from "vue";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
export interface SwitchProps {
  modelValue?: boolean;
  size?: "sm" | "md" | "lg";
  shape?: "pill" | "rectangle";
  disabled?: boolean;
}
withDefaults(defineProps<SwitchProps>(), { modelValue: false, size: "md", shape: "pill" });
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const id = useId();
const sizes = {
  sm: "h-4 w-7 [&_[data-slot=switch-thumb]]:size-3",
  md: "h-6 w-[42px] [&_[data-slot=switch-thumb]]:size-5",
  lg: "h-8 w-14 [&_[data-slot=switch-thumb]]:size-7",
} as const;
</script>
<template>
  <div class="inline-flex items-center gap-2">
    <Switch
      :id="id"
      :model-value="modelValue"
      :disabled="disabled"
      :data-shape="shape"
      :class="[
        sizes[size],
        'data-[shape=rectangle]:rounded-sm data-[shape=rectangle]:[&_[data-slot=switch-thumb]]:rounded-xs',
      ]"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <Label v-if="$slots.default" :for="id"><slot /></Label>
  </div>
</template>
