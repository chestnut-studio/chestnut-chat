<script setup lang="ts">
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * The bare radio glyph — presentation only, no interaction or semantics.
 * Ported from BoardUI components/base/radio/radio.tsx (MIT).
 *
 * Select/deselect animates: the default bordered surface and the selected
 * gradient are stacked layers cross-fading over 200ms, while the white inner
 * dot scales in and out.
 */

type RadioSize = "sm" | "md";

export interface RadioDotProps {
  selected?: boolean;
  size?: RadioSize;
  /** Draws the keyboard focus ring around the glyph. */
  focusVisible?: boolean;
}

const props = withDefaults(defineProps<RadioDotProps>(), {
  selected: false,
  size: "sm",
  focusVisible: false,
});

const dotStyles = {
  sm: {
    dot: "size-3.5",
    inner: "size-[5px]",
    selected:
      "bg-gradient-to-b from-accent-500 to-accent-600 shadow-[inset_0px_0px_0px_0.875px_var(--color-accent-500),inset_0px_1.75px_0px_0px_rgba(255,255,255,0.25)]",
    border: "border-[0.875px]",
  },
  md: {
    dot: "size-4",
    inner: "size-1.5",
    selected:
      "bg-gradient-to-b from-accent-500 to-accent-600 shadow-[inset_0px_0px_0px_1px_var(--color-accent-500),inset_0px_2px_0px_0px_rgba(255,255,255,0.25)]",
    border: "border",
  },
} as const;

const s = dotStyles[props.size];

const rootClasses = computed(() =>
  cx(
    "relative flex shrink-0 items-center justify-center rounded-full",
    s.dot,
    props.focusVisible && "ring-2 ring-border-focus-ring ring-offset-2",
  ),
);
</script>

<template>
  <span aria-hidden="true" :class="rootClasses">
    <!-- Default surface -->
    <span
      :class="
        cx(
          'absolute inset-0 rounded-full border-border-checkbox-default bg-background-primary-default shadow-xs',
          'transition-opacity duration-200 ease',
          s.border,
          selected && 'opacity-0',
        )
      "
    />
    <!-- Selected gradient surface -->
    <span
      :class="
        cx(
          'absolute inset-0 rounded-full',
          'transition-opacity duration-200 ease',
          s.selected,
          !selected && 'opacity-0',
        )
      "
    />
    <!-- Inner dot: absolutely centered and no drop shadow — a downward shadow
         makes the dot read as sitting below center. -->
    <span
      :class="
        cx(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-control-indicator-background',
          'transition-[scale,opacity] duration-200 ease',
          s.inner,
          selected ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
        )
      "
    />
  </span>
</template>
