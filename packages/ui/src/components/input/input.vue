<script setup lang="ts">
import type { Component } from "vue";
import { computed, useId, useSlots } from "vue";
import { cx } from "../../utils/cx";
import HintText from "./hint-text.vue";
import Label from "./label.vue";

/**
 * Text input with optional label, hint, and adornments. Ported from BoardUI
 * components/base/input/input.tsx (MIT) — reimplemented on native elements
 * (the original builds on react-aria-components' TextField, which has no Vue
 * port; label/input/hint wiring is done manually here).
 *
 * State model:
 *   hover        → ring-border-button-hover   (idle, no focus, enabled)
 *   focus-within → ring-border-button-active  (wins over hover)
 *   disabled     → input-disabled-background/foreground
 *   invalid      → background-tertiary-error + foreground-icon-error
 */

type InputSize = "medium" | "small";

export interface InputProps {
  modelValue?: string;
  size?: InputSize;
  label?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  name?: string;
  leadingIcon?: Component;
  trailingIcon?: Component;
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: "",
  size: "medium",
  type: "text",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const slots = useSlots();
const inputId = useId();
const hintId = useId();

const styles = {
  field: [
    "relative flex w-full items-center",
    "rounded-2lg",
    "bg-background-tertiary-default text-foreground-icon-tertiary",
    "ring-2 ring-inset ring-transparent",
    "transition-[background-color,box-shadow,color] duration-[var(--input-transition-ms)] ease",
  ].join(" "),

  fieldSize: {
    medium: "p-2",
    small: "h-8 px-1.5 py-2",
  },

  content: "flex w-full items-center gap-2 min-w-0",
  leftSection: "flex flex-1 items-center gap-0.5 min-w-0",

  input: [
    "min-w-0 flex-1 bg-transparent border-0 outline-none p-0 m-0",
    "font-sans text-body-regular text-text-primary pl-1",
    "placeholder:text-text-tertiary",
    "focus:placeholder:text-text-primary",
    "disabled:text-input-disabled-text disabled:placeholder:text-input-disabled-text",
    "disabled:cursor-not-allowed",
    "aria-invalid:placeholder:text-text-error-placeholder",
  ].join(" "),

  icon: "size-5 shrink-0",
} as const;

const hasAddon = computed(() => Boolean(slots.leadingAddon));

const fieldClasses = computed(() =>
  cx(
    styles.field,
    hasAddon.value ? "h-9 pl-1 pr-2 py-2" : styles.fieldSize[props.size],
    props.invalid && "bg-background-tertiary-error text-foreground-icon-error",
    props.disabled && "bg-input-disabled-background text-input-disabled-foreground",
    // Hover: idle, no focus, enabled. Focus wins over hover.
    !props.disabled &&
      !props.invalid &&
      "hover:ring-border-button-hover focus-within:ring-border-button-active",
    props.disabled && "hover:ring-transparent focus-within:ring-transparent",
  ),
);

const inputClasses = computed(() =>
  cx(styles.input, props.invalid && "text-foreground-icon-error"),
);
</script>

<template>
  <div class="group flex flex-col items-start gap-1">
    <Label v-if="label" :for="inputId" :is-required="required">
      {{ label }}
    </Label>

    <div :class="fieldClasses">
      <div :class="styles.content">
        <div :class="styles.leftSection">
          <slot v-if="hasAddon" name="leadingAddon" />
          <component
            :is="leadingIcon"
            v-else-if="leadingIcon"
            :class="styles.icon"
            aria-hidden="true"
          />
          <input
            :id="inputId"
            :type="type"
            :value="modelValue"
            :placeholder="placeholder"
            :disabled="disabled"
            :readonly="readonly"
            :required="required"
            :autocomplete="autocomplete"
            :name="name"
            :aria-invalid="invalid || undefined"
            :aria-describedby="hint ? hintId : undefined"
            :class="inputClasses"
            @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <component :is="trailingIcon" v-if="trailingIcon" :class="styles.icon" aria-hidden="true" />
      </div>
    </div>

    <HintText v-if="hint" :id="hintId" :is-invalid="invalid">
      {{ hint }}
    </HintText>
  </div>
</template>
