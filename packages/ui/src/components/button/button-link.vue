<script setup lang="ts">
import type { Component } from "vue";
import { Button } from "../ui/button";

export interface ButtonLinkProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "medium" | "small" | "xs";
  iconOnly?: boolean;
  leadingIcon?: Component;
  trailingIcon?: Component;
  href?: string;
  disabled?: boolean;
}
withDefaults(defineProps<ButtonLinkProps>(), { variant: "primary", size: "medium" });
const variants = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  danger: "destructive",
} as const;
const sizes = { medium: "default", small: "sm", xs: "xs" } as const;
const iconSizes = { medium: "icon", small: "icon-sm", xs: "icon-xs" } as const;
</script>

<template>
  <Button
    as="a"
    :href="disabled ? undefined : href"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : undefined"
    :variant="variants[variant]"
    :size="iconOnly ? iconSizes[size] : sizes[size]"
    class="aria-disabled:pointer-events-none aria-disabled:opacity-50"
    @click="disabled && $event.preventDefault()"
  >
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
