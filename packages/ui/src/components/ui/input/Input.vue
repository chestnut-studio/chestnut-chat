<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { useVModel } from "@vueuse/core";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<{
  defaultValue?: string | number;
  modelValue?: string | number;
  class?: HTMLAttributes["class"];
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
  <input
    v-model="modelValue"
    data-slot="input"
    :class="
      cn(
        'file:text-text-primary placeholder:text-text-placeholder selection:bg-accent-500 selection:text-text-white h-10 w-full min-w-0 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-1 text-base text-text-primary shadow-card transition-[color,box-shadow,border-color] outline-none hover:border-border-button-hover file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body-2-regular file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input-disabled-background disabled:text-input-disabled-text md:text-body-2-regular',
        'focus-visible:border-border-focus-ring focus-visible:ring-2 focus-visible:ring-border-focus-ring/30',
        'aria-invalid:border-border-error-default aria-invalid:ring-2 aria-invalid:ring-border-error-default/20',
        props.class,
      )
    "
  />
</template>
