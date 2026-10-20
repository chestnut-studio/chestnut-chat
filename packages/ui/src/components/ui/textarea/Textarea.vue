<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { useVModel } from "@vueuse/core";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
  defaultValue?: string | number;
  modelValue?: string | number;
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void;
}>();

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
});
</script>

<template>
  <textarea
    v-model="modelValue"
    data-slot="textarea"
    :class="
      cn(
        'border-border-button-default placeholder:text-text-placeholder text-text-primary bg-background-primary-default hover:border-border-button-hover focus-visible:border-border-focus-ring focus-visible:ring-border-focus-ring/30 aria-invalid:ring-border-error-default/20 aria-invalid:border-border-error-default flex field-sizing-content min-h-16 w-full rounded-xl border px-3 py-2 text-base shadow-card transition-[color,box-shadow,border-color] outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-input-disabled-background disabled:text-input-disabled-text md:text-body-2-regular',
        props.class,
      )
    "
  />
</template>
