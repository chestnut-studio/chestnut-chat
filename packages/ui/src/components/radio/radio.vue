<script setup lang="ts">
import { useId } from "vue";
import { RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
export interface RadioProps {
  value: string;
  size?: "sm" | "md";
  disabled?: boolean;
}
withDefaults(defineProps<RadioProps>(), { size: "md" });
const id = useId();
</script>
<template>
  <div class="inline-flex items-center gap-2">
    <RadioGroupItem
      :id="id"
      :value="value"
      :disabled="disabled"
      :class="size === 'sm' ? 'size-3.5' : undefined"
    /><Label v-if="$slots.default" :for="id"><slot /></Label>
  </div>
</template>
