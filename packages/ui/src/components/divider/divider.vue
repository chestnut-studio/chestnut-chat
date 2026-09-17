<script setup lang="ts">
import { computed, useSlots } from "vue";
import { cx } from "../../utils/cx";

/**
 * Horizontal content divider with three surface treatments. Ported from
 * BoardUI components/base/divider/divider.tsx (MIT).
 *
 * `single` places content within one continuous hairline, `double` frames it
 * with a line above and below, and `fill` uses the secondary surface color.
 */

type DividerVariant = "single" | "double" | "fill";
type DividerAlign = "start" | "center" | "end";

export interface DividerProps {
  variant?: DividerVariant;
  align?: DividerAlign;
}

const props = withDefaults(defineProps<DividerProps>(), {
  variant: "single",
  align: "center",
});

const slots = useSlots();
const hasContent = computed(() => Boolean(slots.default));

const styles = {
  root: "w-full",
  line: "h-px min-w-0 flex-1 bg-separator-border",
  content: "shrink-0 text-body-medium text-text-secondary",
  align: {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  },
  withContent: {
    single: "flex items-center gap-3",
    double: "flex items-center border-y border-separator-border py-2.5",
    fill: "flex items-center rounded-2lg bg-background-secondary-default px-4 py-2.5",
  },
  empty: {
    single: "h-px bg-separator-border",
    double: "h-2 border-y border-separator-border",
    fill: "h-2 rounded-full bg-background-secondary-default",
  },
} as const;

const rootClasses = computed(() =>
  hasContent.value
    ? cx(styles.root, styles.withContent[props.variant], styles.align[props.align])
    : cx(styles.root, styles.empty[props.variant]),
);

const showLeadingLine = computed(() => props.variant === "single" && props.align !== "start");
const showTrailingLine = computed(() => props.variant === "single" && props.align !== "end");
</script>

<template>
  <div
    v-if="!hasContent"
    role="separator"
    aria-orientation="horizontal"
    :data-variant="variant"
    :class="rootClasses"
  />
  <div v-else :data-variant="variant" :data-align="align" :class="rootClasses">
    <span v-if="showLeadingLine" aria-hidden="true" :class="styles.line" />
    <div :class="styles.content"><slot /></div>
    <span v-if="showTrailingLine" aria-hidden="true" :class="styles.line" />
  </div>
</template>
