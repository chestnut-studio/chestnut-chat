<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Anchor counterpart to IconButton for external and navigational actions.
 * Ported from BoardUI components/base/buttons/icon-button.tsx (MIT).
 */

type IconButtonSize = "medium" | "small";

export interface IconLinkButtonProps {
  icon: Component;
  size?: IconButtonSize;
  href?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<IconLinkButtonProps>(), {
  size: "medium",
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
  <a :href="disabled ? undefined : href" :aria-disabled="disabled || undefined" :class="classes">
    <component :is="icon" :class="styles.icon[size]" aria-hidden="true" />
  </a>
</template>
