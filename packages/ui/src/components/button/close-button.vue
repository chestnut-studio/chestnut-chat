<script setup lang="ts">
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Compact circular dismiss control — the "X" used to close announcements,
 * toasts, modals, and drawers. Ported from BoardUI
 * components/base/buttons/close-button.tsx (MIT).
 *
 * The glyph is a hand-drawn SVG per size (not a shared icon scaled up/down)
 * because scaling a single glyph across sizes scales its stroke too. Each size
 * renders its own X in a viewBox equal to its own pixel dimensions, so
 * `strokeWidth` is always a literal CSS pixel value.
 */

type CloseButtonSize = "2xs" | "xs" | "sm" | "md";

export interface CloseButtonProps {
  size?: CloseButtonSize;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const props = withDefaults(defineProps<CloseButtonProps>(), {
  size: "xs",
  type: "button",
});

const GLYPH_SIZE: Record<CloseButtonSize, number> = {
  "2xs": 6.8,
  xs: 10.8,
  sm: 12.6,
  md: 16.2,
};

const STROKE_WIDTH: Record<CloseButtonSize, number> = {
  "2xs": 1.6,
  xs: 2,
  sm: 2,
  md: 2.5,
};

const GLYPH_INSET: Record<CloseButtonSize, number> = {
  "2xs": 0.57,
  xs: 2,
  sm: 2,
  md: 2,
};

const styles = {
  base: [
    "inline-flex shrink-0 items-center justify-center rounded-full",
    "bg-background-tertiary-default text-foreground-icon-secondary",
    "select-none cursor-pointer",
    "transition-colors duration-150 ease",
    "hover:text-text-primary",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
  ].join(" "),
  container: {
    "2xs": "size-4",
    xs: "size-5",
    sm: "size-6",
    md: "size-8",
  },
} as const;

const glyph = computed(() => GLYPH_SIZE[props.size]);
const strokeWidth = computed(() => STROKE_WIDTH[props.size]);
const inset = computed(() => GLYPH_INSET[props.size]);
const classes = computed(() => cx(styles.base, styles.container[props.size]));
</script>

<template>
  <button :type :disabled :class="classes">
    <svg
      :width="glyph"
      :height="glyph"
      :viewBox="`0 0 ${glyph} ${glyph}`"
      fill="none"
      aria-hidden="true"
    >
      <path
        :d="`M${inset} ${inset}L${glyph - inset} ${glyph - inset}`"
        stroke="currentColor"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
      />
      <path
        :d="`M${glyph - inset} ${inset}L${inset} ${glyph - inset}`"
        stroke="currentColor"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>
