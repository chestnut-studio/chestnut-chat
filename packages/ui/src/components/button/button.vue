<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { Button } from "../ui/button";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "medium" | "small" | "xs";
  iconOnly?: boolean;
  leadingIcon?: Component;
  trailingIcon?: Component;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}
const props = withDefaults(defineProps<ButtonProps>(), {
  variant: "primary",
  size: "medium",
  type: "button",
});
const variants = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  danger: "destructive",
} as const;
const sizes = { medium: "default", small: "sm", xs: "xs" } as const;
const iconSizes = { medium: "icon", small: "icon-sm", xs: "icon-xs" } as const;
const buttonSize = computed(() => (props.iconOnly ? iconSizes[props.size] : sizes[props.size]));
</script>

<template>
  <Button :variant="variants[variant]" :size="buttonSize" :type="type" :disabled="disabled">
    <component :is="leadingIcon" v-if="leadingIcon" data-icon="inline-start" aria-hidden="true" />
    <slot v-if="!iconOnly" />
    <component
      :is="trailingIcon"
      v-if="!iconOnly && trailingIcon"
      data-icon="inline-end"
      aria-hidden="true"
    />
  </Button>
</template>
