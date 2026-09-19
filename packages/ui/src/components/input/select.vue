<script setup lang="ts" generic="T extends string | null">
import { useId } from "vue";
import Label from "./label.vue";
import HintText from "./hint-text.vue";

export interface SelectItem<T> {
  label: string;
  value: T;
}

defineProps<{ items: SelectItem<T>[]; label?: string; hint?: string; disabled?: boolean }>();
const model = defineModel<T>({ required: true });
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1">
    <Label v-if="label" :for="id">{{ label }}</Label>
    <select
      :id="id"
      v-model="model"
      :disabled="disabled"
      class="h-9 w-full rounded-2lg border border-border-button-default bg-background-primary-default px-3 text-body-regular text-text-primary outline-none transition-colors hover:border-border-button-hover focus:ring-2 focus:ring-border-focus-ring disabled:opacity-50"
    >
      <option v-for="item in items" :key="String(item.value)" :value="item.value">
        {{ item.label }}
      </option>
    </select>
    <HintText v-if="hint">{{ hint }}</HintText>
  </div>
</template>
