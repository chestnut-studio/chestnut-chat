<script setup lang="ts">
import { nextTick, useTemplateRef } from "vue";

const props = withDefaults(defineProps<{ length?: number; disabled?: boolean }>(), { length: 6 });
const model = defineModel<number[]>({ default: () => [] });
const inputs = useTemplateRef<HTMLInputElement[]>("inputs");
const emit = defineEmits<{ complete: [value: number[]] }>();

function update(index: number, event: Event) {
  const value = (event.target as HTMLInputElement).value.replace(/\D/g, "").slice(-1);
  const next = Array.from({ length: props.length }, (_, i) => model.value[i]).filter(
    (digit): digit is number => digit !== undefined,
  );
  if (value) next[index] = Number(value);
  else next.splice(index, 1);
  model.value = next;
  if (value && index < props.length - 1) nextTick(() => inputs.value?.[index + 1]?.focus());
  if (next.length === props.length) emit("complete", next);
}

function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === "Backspace" && !model.value[index] && index > 0)
    inputs.value?.[index - 1]?.focus();
}
</script>

<template>
  <div class="flex gap-2" role="group">
    <input
      v-for="index in length"
      :key="index"
      ref="inputs"
      :value="model[index - 1] ?? ''"
      :disabled="disabled"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      class="size-11 rounded-xl border border-border-button-default bg-background-primary-default text-center text-title-3-medium text-text-primary outline-none focus:ring-2 focus:ring-border-focus-ring"
      @input="update(index - 1, $event)"
      @keydown="onKeydown(index - 1, $event)"
    />
  </div>
</template>
