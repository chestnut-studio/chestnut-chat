<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Ported from BoardUI components/base/buttons/icon-button.tsx (MIT).
 *
 * Square icon-only button, radius/2lg at both sizes:
 *   medium 36×36 (8 padding, 20×20 icon) · small 32×32 (8 padding, 16×16 icon)
 * Secondary style only — white fill, border/button/default, shadow/xs.
 */

type IconButtonSize = "medium" | "small";

export interface IconButtonProps {
  icon: Component;
  size?: IconButtonSize;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const props = withDefaults(defineProps<IconButtonProps>(), {
  size: "medium",
  type: "button",
});

const styles = {
  base: [
    "relative inline-flex shrink-0 items-center justify-center overflow-visible rounded-2lg",
    "bg-background-primary-default text-foreground-icon-primary",
    "border border-border-button-default shadow-xs",
    "select-none cursor-pointer",
    "transition-[background-color,border-color,box-shadow,color] duration-150 ease",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
    "hover:bg-background-primary-hover hover:border-border-button-hover",
    "active:bg-background-primary-active active:border-border-button-active",
    "disabled:cursor-not-allowed disabled:bg-background-primary-disabled disabled:border-border-button-default disabled:text-icon-button-disabled-foreground disabled:opacity-60 disabled:shadow-none",
  ].join(" "),
  size: {
    medium: "size-9",
    small: "size-8",
  },
  icon: {
    medium: "size-5 shrink-0",
    small: "size-4 shrink-0",
  },
} as const;

const classes = computed(() => cx(styles.base, styles.size[props.size]));
</script>

<template>
  <button :type :disabled :class="classes">
    <component :is="icon" :class="styles.icon[size]" aria-hidden="true" />
  </button>
</template>
