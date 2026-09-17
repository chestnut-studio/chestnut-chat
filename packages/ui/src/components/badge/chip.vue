<script setup lang="ts">
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Colored label chip — status chips, delta chips, price chips, role tags.
 * Ported from BoardUI components/base/badges/chip.tsx (MIT).
 *
 * Three emphasis levels, all rounded radius/md (6px), px 6:
 *   bold    py 2, Body 1/Medium   — status + percentage deltas
 *   subtle  py 4, Body 1/Medium   — price chips
 *   caption py 4, Caption 1/Medium — role tags
 */

type ChipVariant = "bold" | "subtle" | "caption";
type ChipColor =
  | "lime"
  | "rose"
  | "yellow"
  | "cyan"
  | "blue"
  | "purple"
  | "neutral"
  | "gray"
  | "soft";

export interface ChipProps {
  variant?: ChipVariant;
  color?: ChipColor;
}

const props = withDefaults(defineProps<ChipProps>(), {
  variant: "bold",
  color: "neutral",
});

const styles = {
  base: "inline-flex items-center justify-center rounded-md px-1.5 whitespace-nowrap transition-[padding,font-size] duration-200 ease",
  variant: {
    bold: "py-0.5 text-body-medium",
    subtle: "py-1 text-body-medium",
    caption: "py-1 text-caption-1-medium",
  },
  color: {
    lime: "bg-status-lime-background text-status-lime-text",
    rose: "bg-status-rose-background text-status-rose-text",
    yellow: "bg-status-yellow-background text-status-yellow-text",
    cyan: "bg-status-cyan-background text-status-cyan-text",
    blue: "bg-status-blue-background text-status-blue-text",
    purple: "bg-status-purple-background text-status-purple-text",
    neutral: "bg-background-tertiary-default text-text-secondary",
    gray: "bg-background-secondary-default text-text-primary",
    soft: "bg-background-secondary-default text-text-secondary",
  },
} as const;

const classes = computed(() =>
  cx(styles.base, styles.variant[props.variant], styles.color[props.color]),
);
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
