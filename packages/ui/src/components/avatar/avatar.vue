<script setup lang="ts">
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Avatar. Ported from BoardUI components/base/avatar/avatar.tsx (MIT).
 *
 * Sizes: xs = 20 · sm = 24 · md = 32 · lg = 36.
 * Renders a photo when `src` is given, otherwise centered initials on a
 * tinted disc.
 */

type AvatarSize = "xs" | "sm" | "md" | "lg";
type AvatarColor = "neutral" | "blue" | "lime" | "pink";

export interface AvatarProps {
  size?: AvatarSize;
  color?: AvatarColor;
  /** Photo URL. Wins over `initials`. */
  src?: string;
  alt?: string;
  /** Fallback initials, e.g. "M". */
  initials?: string;
}

const props = withDefaults(defineProps<AvatarProps>(), {
  size: "md",
  color: "neutral",
});

const styles = {
  base: "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-center align-middle transition-[width,height,font-size] duration-200 ease",
  size: {
    xs: "size-5 text-[10px] leading-[15px] font-semibold",
    sm: "size-6 text-caption-1-semibold tracking-normal",
    md: "size-8 text-headline-semibold",
    lg: "size-9 text-[18px] leading-6 font-semibold",
  },
  color: {
    neutral: "bg-avatar-neutral-background text-text-secondary",
    blue: "bg-blue-300 text-blue-900",
    lime: "bg-lime-200 text-lime-700",
    pink: "bg-pink-200 text-pink-500",
  },
} as const;

const classes = computed(() => cx(styles.base, styles.size[props.size], styles.color[props.color]));
</script>

<template>
  <span :class="classes">
    <img
      v-if="src"
      :src="src"
      :alt="alt ?? ''"
      loading="lazy"
      decoding="async"
      class="size-full object-cover"
    />
    <template v-else>{{ initials }}</template>
  </span>
</template>
