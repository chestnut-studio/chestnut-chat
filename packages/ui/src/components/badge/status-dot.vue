<script setup lang="ts">
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * 12×12 status indicator: a 6px solid dot centered on a tinted halo. Ported
 * from BoardUI components/base/badges/status-dot.tsx (MIT).
 *
 * In dark mode only the halo drops to 40% opacity; the center dot stays solid.
 */

type StatusDotColor = "green" | "yellow" | "indigo";

export interface StatusDotProps {
  color?: StatusDotColor;
}

const props = withDefaults(defineProps<StatusDotProps>(), { color: "green" });

const styles = {
  base: "inline-flex size-3 shrink-0 items-center justify-center rounded-full",
  halo: {
    green: "bg-status-dot-green-halo",
    yellow: "bg-status-dot-yellow-halo",
    indigo: "bg-status-dot-indigo-halo",
  },
  dot: {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    indigo: "bg-indigo-500",
  },
} as const;

const classes = computed(() => cx(styles.base, styles.halo[props.color]));
</script>

<template>
  <span aria-hidden="true" :class="classes">
    <span :class="cx('size-1.5 rounded-full', styles.dot[color])" />
  </span>
</template>
