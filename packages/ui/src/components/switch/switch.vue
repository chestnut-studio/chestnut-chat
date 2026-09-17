<script setup lang="ts">
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Switch. Ported from BoardUI components/base/switch/switch.tsx (MIT) —
 * reimplemented on a native <button role="switch"> (the original builds on
 * react-aria-components).
 *
 * Two shapes × three sizes: pill / rectangle × sm 28×16 · md 42×24 · lg 56×32.
 *   off → bg-background-tertiary-default
 *   on  → Button/Primary gradient (accent-500 → accent-600) + inset ring +
 *         top highlight that scales with size
 */

type SwitchSize = "sm" | "md" | "lg";
type SwitchShape = "pill" | "rectangle";

export interface SwitchProps {
  modelValue?: boolean;
  size?: SwitchSize;
  shape?: SwitchShape;
  disabled?: boolean;
}

const props = withDefaults(defineProps<SwitchProps>(), {
  modelValue: false,
  size: "md",
  shape: "pill",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const switchSizes = {
  sm: {
    track: "h-4 w-7",
    trackRadius: { pill: "rounded-full", rectangle: "rounded-[3px]" },
    onShadow:
      "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_0.5px_var(--color-accent-500)]",
    thumb: "size-3",
    thumbRadius: { pill: "rounded-full", rectangle: "rounded-[1px]" },
    offset: "left-0.5 top-0.5",
    travel: "translate-x-3",
    chip: "size-[5px] border-[0.25px] shadow-[0_2px_2px_0_rgb(0_0_0/0.03)]",
    chipRadius: { pill: "rounded-full", rectangle: "rounded-[0.5px]" },
  },
  md: {
    track: "h-6 w-[42px]",
    trackRadius: { pill: "rounded-full", rectangle: "rounded-[4.5px]" },
    onShadow:
      "shadow-[inset_0_1.5px_0_0_rgb(255_255_255/0.25),inset_0_0_0_0.75px_var(--color-accent-500)]",
    thumb: "size-[18px]",
    thumbRadius: { pill: "rounded-full", rectangle: "rounded-[1.5px]" },
    offset: "left-[3px] top-[3px]",
    travel: "translate-x-[18px]",
    chip: "size-[7.5px] border-[0.375px] shadow-[0_3px_3px_0_rgb(0_0_0/0.03)]",
    chipRadius: { pill: "rounded-full", rectangle: "rounded-[0.75px]" },
  },
  lg: {
    track: "h-8 w-14",
    trackRadius: { pill: "rounded-full", rectangle: "rounded-md" },
    onShadow: "shadow-checkbox-selected",
    thumb: "size-6",
    thumbRadius: { pill: "rounded-full", rectangle: "rounded-xs" },
    offset: "left-1 top-1",
    travel: "translate-x-6",
    chip: "size-[10px] border-[0.5px] shadow-[0_4px_4px_0_rgb(0_0_0/0.03)]",
    chipRadius: { pill: "rounded-full", rectangle: "rounded-[1px]" },
  },
} as const;

const s = switchSizes[props.size];

const trackClasses = computed(() =>
  cx(
    "relative shrink-0 transition-colors duration-200 ease",
    s.track,
    s.trackRadius[props.shape],
    props.modelValue
      ? cx("bg-linear-to-b from-accent-500 to-accent-600", s.onShadow)
      : "bg-background-tertiary-default",
    props.disabled && "opacity-50",
  ),
);

const thumbClasses = computed(() =>
  cx(
    "absolute flex items-center justify-center",
    "bg-linear-to-b from-control-indicator-background from-[43.837%] to-control-indicator-background-subtle",
    "shadow-[0_3px_3px_0_rgb(0_0_0/0.03),0_0.75px_0_0_rgb(0_0_0/0.05)]",
    "transition-transform duration-200 ease",
    s.thumb,
    s.thumbRadius[props.shape],
    s.offset,
    props.modelValue && s.travel,
  ),
);

const chipClasses = computed(() =>
  cx(
    "border-solid bg-linear-to-t from-[43.837%]",
    s.chip,
    s.chipRadius[props.shape],
    props.modelValue
      ? "border-accent-600 from-switch-on-chip-start to-switch-on-chip-end"
      : "border-border-button-default/50 from-switch-off-chip-start to-switch-off-chip-end",
  ),
);
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="group inline-flex items-center gap-2 select-none outline-none"
    :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      aria-hidden="true"
      :class="
        cx(
          trackClasses,
          'group-focus-visible:ring-2 group-focus-visible:ring-border-focus-ring group-focus-visible:ring-offset-2',
        )
      "
    >
      <span :class="thumbClasses">
        <span :class="chipClasses" />
      </span>
    </span>
    <span v-if="$slots.default" class="text-body-medium text-text-primary"><slot /></span>
  </button>
</template>
