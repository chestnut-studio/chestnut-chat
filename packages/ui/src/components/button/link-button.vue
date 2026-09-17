<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Link button — an inline text action styled like a link, sized on the same
 * scale as Button but without the container. Ported from BoardUI
 * components/base/buttons/link-button.tsx (MIT).
 *
 * Renders an <a> when `href` is passed, otherwise a <button>. Icons are
 * rendered via `leadingIcon` / `trailingIcon` (pass a component reference,
 * not an element).
 */

type LinkButtonVariant = "primary" | "secondary";
type LinkButtonSize = "medium" | "small" | "xs";

export interface LinkButtonProps {
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  leadingIcon?: Component;
  trailingIcon?: Component;
  href?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const props = withDefaults(defineProps<LinkButtonProps>(), {
  variant: "primary",
  size: "medium",
});

const styles = {
  base: [
    "inline-flex items-center justify-center gap-1 whitespace-nowrap",
    "font-sans select-none cursor-pointer rounded-sm",
    "underline-offset-3 hover:underline",
    "transition-colors duration-150 ease",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
    "disabled:cursor-not-allowed disabled:no-underline aria-disabled:cursor-not-allowed aria-disabled:no-underline",
  ].join(" "),

  size: {
    medium: "text-body-medium",
    small: "text-body-medium",
    xs: "text-caption-1-semibold",
  },

  icon: {
    medium: "size-5 shrink-0",
    small: "size-[18px] shrink-0",
    xs: "size-3.5 shrink-0",
  },

  variant: {
    // Hover keeps the resting color — the underline is the hover cue; only
    // the press darkens.
    primary: [
      "text-accent-600 active:text-accent-800",
      "disabled:text-text-tertiary aria-disabled:text-text-tertiary",
    ].join(" "),
    secondary: [
      "text-text-secondary active:text-text-primary",
      "disabled:text-text-tertiary aria-disabled:text-text-tertiary",
    ].join(" "),
  },
} as const;

const classes = computed(() =>
  cx(styles.base, styles.size[props.size], styles.variant[props.variant]),
);
</script>

<template>
  <a
    v-if="href !== undefined"
    :href="disabled ? undefined : href"
    :aria-disabled="disabled || undefined"
    :class="classes"
  >
    <component :is="leadingIcon" v-if="leadingIcon" :class="styles.icon[size]" aria-hidden="true" />
    <span v-if="$slots.default"><slot /></span>
    <component
      :is="trailingIcon"
      v-if="trailingIcon"
      :class="styles.icon[size]"
      aria-hidden="true"
    />
  </a>
  <button v-else :type="type" :disabled :class="classes">
    <component :is="leadingIcon" v-if="leadingIcon" :class="styles.icon[size]" aria-hidden="true" />
    <span v-if="$slots.default"><slot /></span>
    <component
      :is="trailingIcon"
      v-if="trailingIcon"
      :class="styles.icon[size]"
      aria-hidden="true"
    />
  </button>
</template>
