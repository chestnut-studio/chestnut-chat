<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Item inside a ButtonGroup. Ported from BoardUI
 * components/base/buttons/button-group.tsx (MIT).
 *
 * A pressed/selected item keeps the hover fill — drive it from state for
 * single or multi select toolbars.
 */

export interface ButtonGroupItemProps {
  size?: "medium" | "small";
  selected?: boolean;
  iconOnly?: boolean;
  leadingIcon?: Component;
  trailingIcon?: Component;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const props = withDefaults(defineProps<ButtonGroupItemProps>(), {
  size: "medium",
  selected: false,
  iconOnly: false,
  type: "button",
});

const styles = {
  item: [
    "inline-flex items-center justify-center gap-1 whitespace-nowrap",
    "bg-background-primary-default text-text-primary font-sans select-none cursor-pointer",
    "transition-[background-color,color] duration-150 ease",
    "outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring",
    "hover:bg-background-primary-hover active:bg-background-primary-active",
    "disabled:cursor-not-allowed disabled:bg-background-primary-disabled disabled:text-text-tertiary",
  ].join(" "),

  size: {
    medium: "h-[34px] px-3 text-body-medium",
    small: "h-[30px] px-2.5 text-body-medium",
  },

  iconOnlySize: {
    medium: "w-[34px] px-0",
    small: "w-[30px] px-0",
  },

  icon: {
    medium: "size-5 shrink-0",
    small: "size-[18px] shrink-0",
  },

  selected: "bg-background-primary-hover",
} as const;

const classes = computed(() =>
  cx(
    styles.item,
    styles.size[props.size],
    props.iconOnly && styles.iconOnlySize[props.size],
    props.selected && styles.selected,
  ),
);
</script>

<template>
  <button :type :disabled :aria-pressed="selected || undefined" :class="classes">
    <component :is="leadingIcon" v-if="leadingIcon" :class="styles.icon[size]" aria-hidden="true" />
    <span v-if="!iconOnly && $slots.default"><slot /></span>
    <component
      :is="trailingIcon"
      v-if="!iconOnly && trailingIcon"
      :class="styles.icon[size]"
      aria-hidden="true"
    />
  </button>
</template>
