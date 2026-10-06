<script setup lang="ts">
import { computed, nextTick, useAttrs, useId } from "vue";
import { Field } from "../ui/field";
import { Textarea } from "../ui/textarea";
import HintText from "./hint-text.vue";
import Label from "./label.vue";
export interface TextareaProps {
  modelValue?: string;
  label?: string;
  hint?: string;
  placeholder?: string;
  rows?: number;
  maxlength?: number;
  disabled?: boolean;
  required?: boolean;
  autoresize?: boolean;
  maxrows?: number;
}
const props = withDefaults(defineProps<TextareaProps>(), { modelValue: "", rows: 3 });
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const id = useId();
const hintId = useId();
const maxHeight = computed(() => (props.maxrows ? `${props.maxrows * 1.25 + 1}rem` : undefined));
async function resize(event: Event) {
  if (!props.autoresize) return;
  const element = event.target as HTMLTextAreaElement;
  await nextTick();
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}
</script>
<template>
  <Field :class="attrs.class" :data-disabled="disabled || undefined" class="gap-1.5">
    <Label v-if="label" :for="String(attrs.id ?? id)" :is-required="required">{{ label }}</Label>
    <Textarea
      v-bind="{ ...attrs, class: undefined }"
      :id="String(attrs.id ?? id)"
      :model-value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :disabled="disabled"
      :required="required"
      :aria-describedby="hint ? hintId : undefined"
      class="resize-none"
      :style="{ maxHeight, fieldSizing: autoresize ? 'content' : 'fixed' }"
      @update:model-value="emit('update:modelValue', String($event))"
      @input="resize"
    />
    <HintText v-if="hint" :id="hintId">{{ hint }}</HintText>
  </Field>
</template>
