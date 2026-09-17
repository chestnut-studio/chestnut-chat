<script setup lang="ts">
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Small numeric counter pill (nav item counts, unread totals). Ported from
 * BoardUI components/base/badges/badge.tsx (MIT).
 *
 *   primary → bg accent/400, white text (sits on the selected nav item)
 *   neutral → bg badge-neutral-background, text/secondary
 */

type BadgeColor = "primary" | "neutral";

export interface BadgeProps {
  color?: BadgeColor;
}

const props = withDefaults(defineProps<BadgeProps>(), { color: "neutral" });

const styles = {
  base: "inline-flex items-center justify-center rounded-sm px-1 py-px text-caption-1-semibold tracking-normal whitespace-nowrap",
  color: {
    primary: "bg-accent-400 text-white",
    neutral: "bg-badge-neutral-background text-text-secondary",
  },
} as const;

const classes = computed(() => cx(styles.base, styles.color[props.color]));
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
