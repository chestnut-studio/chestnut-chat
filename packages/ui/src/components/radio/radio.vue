<script setup lang="ts">
import { computed, inject } from "vue";
import { cx } from "../../utils/cx";
import { radioGroupKey } from "./radio-group-context";
import RadioDot from "./radio-dot.vue";

/**
 * Radio. Ported from BoardUI components/base/radio/radio.tsx (MIT) — native
 * <input type="radio"> wired to the parent RadioGroup via name + provide /
 * inject, so arrow-key navigation and form semantics come from the browser.
 */

type RadioSize = "sm" | "md";

export interface RadioProps {
  value: string;
  size?: RadioSize;
  disabled?: boolean;
}

const props = withDefaults(defineProps<RadioProps>(), { size: "md" });

const group = inject(radioGroupKey, undefined);

if (!group) {
  throw new Error("<Radio> must be used inside a <RadioGroup>.");
}

const isSelected = computed(() => group.modelValue() === props.value);

const dotStyles = {
  sm: { gap: "gap-2", label: "text-body-2-medium" },
  md: { gap: "gap-2", label: "text-body-medium" },
} as const;

const s = dotStyles[props.size];
</script>

<template>
  <label
    class="group inline-flex items-center select-none"
    :class="[s.gap, disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']"
  >
    <input
      type="radio"
      class="peer sr-only"
      :name="group.name"
      :value="value"
      :checked="isSelected"
      :disabled="disabled"
      @change="group.select(value)"
    />
    <RadioDot
      :selected="isSelected"
      :size="size"
      class="peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus-ring peer-focus-visible:ring-offset-2"
    />
    <span v-if="$slots.default" :class="cx(s.label, 'text-text-primary')"><slot /></span>
  </label>
</template>
