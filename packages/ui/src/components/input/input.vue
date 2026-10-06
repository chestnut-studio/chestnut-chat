<script setup lang="ts">
import type { Component } from "vue";
import { useAttrs, useId } from "vue";
import { Field } from "../ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon } from "../ui/input-group";
import Label from "./label.vue";
import HintText from "./hint-text.vue";

export interface InputProps {
  modelValue?: string;
  size?: "medium" | "small";
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
withDefaults(defineProps<InputProps>(), { modelValue: "", size: "medium", type: "text" });
defineOptions({ inheritAttrs: false });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const attrs = useAttrs();
const inputId = useId();
const hintId = useId();
</script>
<template>
  <Field
    :class="attrs.class"
    :data-invalid="invalid || undefined"
    :data-disabled="disabled || undefined"
    class="gap-1.5"
  >
    <Label v-if="label" :for="String(attrs.id ?? inputId)" :is-required="required">{{
      label
    }}</Label>
    <InputGroup :class="size === 'small' ? 'h-8' : undefined">
      <InputGroupInput
        v-bind="{ ...attrs, class: undefined }"
        :id="String(attrs.id ?? inputId)"
        :model-value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :name="name"
        :aria-invalid="invalid || undefined"
        :aria-describedby="hint ? hintId : undefined"
        @update:model-value="emit('update:modelValue', String($event))"
      />
      <InputGroupAddon v-if="$slots.leadingAddon || leadingIcon" align="inline-start">
        <slot name="leadingAddon"
          ><component :is="leadingIcon" v-if="leadingIcon" aria-hidden="true"
        /></slot>
      </InputGroupAddon>
      <InputGroupAddon v-if="trailingIcon" align="inline-end"
        ><component :is="trailingIcon" aria-hidden="true"
      /></InputGroupAddon>
    </InputGroup>
    <HintText v-if="hint" :id="hintId" :is-invalid="invalid">{{ hint }}</HintText>
  </Field>
</template>
