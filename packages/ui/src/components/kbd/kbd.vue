<script setup lang="ts">
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Keyboard shortcut hint: 12/16 semibold on a fully-rounded neutral pill.
 * Ported from BoardUI components/base/kbd/kbd.tsx (MIT).
 */

const classes = computed(() =>
  cx(
    "inline-flex items-center justify-center rounded-full bg-kbd-background px-1 py-0.5 font-sans text-caption-1-semibold tracking-normal whitespace-nowrap text-kbd-foreground",
  ),
);
</script>

<template>
  <kbd :class="classes"><slot /></kbd>
</template>
