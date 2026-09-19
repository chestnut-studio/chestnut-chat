<script setup lang="ts">
import { computed, nextTick, useId, useTemplateRef } from "vue";
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
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const textarea = useTemplateRef<HTMLTextAreaElement>("textarea");
const id = useId();
const hintId = useId();
const maxHeight = computed(() => (props.maxrows ? `${props.maxrows * 1.25 + 1}rem` : undefined));

async function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
  if (!props.autoresize) return;
  await nextTick();
  if (textarea.value) {
    textarea.value.style.height = "auto";
    textarea.value.style.height = `${textarea.value.scrollHeight}px`;
  }
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <Label v-if="label" :for="id" :is-required="required">{{ label }}</Label>
    <textarea
      :id="id"
      ref="textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :disabled="disabled"
      :required="required"
      :aria-describedby="hint ? hintId : undefined"
      class="w-full resize-none rounded-2lg border-0 bg-background-tertiary-default p-3 text-body-regular text-text-primary outline-none ring-2 ring-inset ring-transparent placeholder:text-text-placeholder hover:ring-border-button-hover focus:ring-border-button-active disabled:cursor-not-allowed disabled:opacity-50"
      :style="{ maxHeight }"
      @input="onInput"
    />
    <HintText v-if="hint" :id="hintId">{{ hint }}</HintText>
  </div>
</template>
