<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { cx } from "../../utils/cx";

/**
 * Checkbox. Ported from BoardUI components/base/checkbox/checkbox.tsx and
 * checkbox-glyph.tsx (MIT) — reimplemented on a native <input type="checkbox">
 * (the original builds on react-aria-components).
 *
 * radius/sm (4px). Two sizes: md 16×16 · sm 14×14.
 *   default    bg-background-primary-default, 1px border-checkbox, shadow-xs
 *   hover      border darkens to border-checkbox-hover
 *   checked /  Button/Primary gradient (accent-500 → accent-600) with the
 *   indeterminate  checkbox inner highlight (--shadow-checkbox-selected)
 */

type CheckboxSize = "sm" | "md";

export interface CheckboxProps {
  modelValue?: boolean;
  indeterminate?: boolean;
  size?: CheckboxSize;
  disabled?: boolean;
  value?: string;
  name?: string;
}

const props = withDefaults(defineProps<CheckboxProps>(), {
  modelValue: false,
  indeterminate: false,
  size: "md",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  change: [value: boolean];
}>();

const inputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.indeterminate,
  (value) => {
    if (inputRef.value) inputRef.value.indeterminate = value;
  },
  { immediate: true },
);

const checkboxSizes: Record<
  CheckboxSize,
  { box: string; glyph: string; label: string; gap: string }
> = {
  md: { box: "size-4", glyph: "size-4", label: "text-body-medium", gap: "gap-2" },
  sm: { box: "size-3.5", glyph: "size-3.5", label: "text-body-2-medium", gap: "gap-1.5" },
};

const s = checkboxSizes[props.size];
const isMarked = computed(() => props.modelValue || props.indeterminate);

const glyphClasses = computed(() =>
  cx(
    "flex shrink-0 items-center justify-center rounded-sm",
    "transition-[background-color,border-color,box-shadow] duration-150 ease",
    s.box,
    isMarked.value
      ? cx("bg-linear-to-b shadow-checkbox-selected", "from-accent-500 to-accent-600")
      : cx(
          "border bg-background-primary-default shadow-xs",
          "border-border-checkbox-default group-hover:border-border-checkbox-hover",
        ),
    props.disabled && "opacity-50",
  ),
);
</script>

<template>
  <label
    class="group inline-flex items-center select-none"
    :class="[s.gap, disabled ? 'cursor-not-allowed' : 'cursor-pointer']"
  >
    <input
      ref="inputRef"
      type="checkbox"
      class="peer sr-only"
      :checked="modelValue"
      :value="value"
      :name="name"
      :disabled="disabled"
      @change="
        emit('update:modelValue', ($event.target as HTMLInputElement).checked);
        emit('change', ($event.target as HTMLInputElement).checked);
      "
    />
    <span
      aria-hidden="true"
      :class="
        cx(
          glyphClasses,
          'peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus-ring peer-focus-visible:ring-offset-2',
        )
      "
    >
      <svg viewBox="0 0 16 16" fill="none" :class="s.glyph">
        <path
          v-if="indeterminate"
          d="M4.5 8H8H11.5"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
        />
        <path
          v-else-if="modelValue"
          d="M4 7.7002L6.64645 10.3466C6.84171 10.5419 7.15829 10.5419 7.35355 10.3466L12 5.7002"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          pathLength="1"
          class="animate-check-draw"
        />
      </svg>
    </span>
    <span v-if="$slots.default" :class="cx(s.label, 'text-text-primary')"><slot /></span>
  </label>
</template>
