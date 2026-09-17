<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Ported from BoardUI components/base/buttons/button.tsx (MIT).
 *
 * Variant matrix from Figma:
 *   Type     = Primary | Secondary | Ghost | Danger  (renamed to `variant`)
 *   Size     = Medium | Small | Xs
 *   State    = Default | Hover | Active | Disabled   (CSS pseudo)
 *   OnlyIcon = false  | true
 *
 * Icons are rendered by the component itself via `leadingIcon` / `trailingIcon`
 * so the consumer can't pass the wrong size. Pass an icon component reference
 * (e.g. from lucide-vue-next), not a rendered element.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "medium" | "small" | "xs";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  leadingIcon?: Component;
  trailingIcon?: Component;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: "primary",
  size: "medium",
  iconOnly: false,
  type: "button",
});

const styles = {
  base: [
    "inline-flex items-center justify-center gap-0.5 whitespace-nowrap overflow-hidden",
    "font-sans select-none cursor-pointer",
    "button-press-motion",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
    "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
  ].join(" "),

  size: {
    medium: "h-9 rounded-2lg p-2 text-body-medium",
    small: "h-8 rounded-lg px-2 py-1.5 text-body-medium",
    xs: "h-6 rounded-sm px-2 text-caption-1-semibold",
  },

  iconOnlySize: {
    medium: "",
    small: "size-8 p-0",
    xs: "size-6 p-0",
  },

  icon: {
    medium: "size-5 shrink-0",
    small: "size-[18px] shrink-0",
    xs: "size-3.5 shrink-0",
  },

  label: {
    medium: "inline-flex items-center justify-center px-1 shrink-0",
    small: "inline-flex items-center justify-center px-0.5 shrink-0",
    xs: "inline-flex items-center justify-center px-0.5 shrink-0",
  },

  variant: {
    primary: [
      "bg-button-primary text-text-white shadow-xs",
      "disabled:text-button-primary-disabled-foreground disabled:shadow-none",
      "aria-disabled:text-button-primary-disabled-foreground aria-disabled:shadow-none",
    ].join(" "),
    danger: [
      "bg-button-danger text-text-white shadow-xs",
      "disabled:text-foreground-disabled-danger disabled:shadow-none",
      "aria-disabled:text-foreground-disabled-danger aria-disabled:shadow-none",
    ].join(" "),
    secondary: [
      "bg-background-primary-default text-text-primary",
      "border border-border-button-default shadow-xs",
      "hover:bg-background-primary-hover  hover:border-border-button-hover",
      "active:bg-background-primary-active active:border-border-button-active",
      "disabled:bg-background-primary-disabled disabled:border-border-button-default disabled:text-text-tertiary disabled:shadow-none",
      "aria-disabled:bg-background-primary-disabled aria-disabled:border-border-button-default aria-disabled:text-text-tertiary aria-disabled:shadow-none",
    ].join(" "),
    ghost: [
      "bg-button-ghost-background text-button-ghost-foreground",
      "hover:bg-button-ghost-hover active:bg-button-ghost-active",
      "disabled:bg-button-ghost-disabled disabled:text-button-ghost-disabled-foreground disabled:shadow-none",
      "aria-disabled:bg-button-ghost-disabled aria-disabled:text-button-ghost-disabled-foreground aria-disabled:shadow-none",
    ].join(" "),
  },
} as const;

const classes = computed(() =>
  cx(
    styles.base,
    styles.size[props.size],
    styles.variant[props.variant],
    props.iconOnly && styles.iconOnlySize[props.size],
  ),
);
</script>

<template>
  <button :type :disabled :class="classes">
    <component :is="leadingIcon" v-if="leadingIcon" :class="styles.icon[size]" aria-hidden="true" />
    <span v-if="!iconOnly" :class="styles.label[size]">
      <slot />
    </span>
    <component
      :is="trailingIcon"
      v-if="!iconOnly && trailingIcon"
      :class="styles.icon[size]"
      aria-hidden="true"
    />
  </button>
</template>
