<script setup lang="ts" generic="T extends string | null">
import { computed, useAttrs, useId } from "vue";
import { Field } from "../ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem as ShadcnSelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import Label from "./label.vue";
import HintText from "./hint-text.vue";
export interface SelectItem<T> {
  label: string;
  value: T;
}
const props = defineProps<{
  items: SelectItem<T>[];
  label?: string;
  hint?: string;
  disabled?: boolean;
}>();
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const model = defineModel<T>({ required: true });
const id = useId();
const hintId = useId();
// Reka reserves the empty string; index keys also preserve null-valued options.
const selected = computed(() => {
  const index = props.items.findIndex((item) => item.value === model.value);
  return index < 0 ? undefined : `option-${index}`;
});
function update(value: unknown) {
  const item = props.items.find((_, index) => `option-${index}` === value);
  if (item) model.value = item.value;
}
</script>
<template>
  <Field :class="attrs.class" class="gap-1.5">
    <Label v-if="label" :for="String(attrs.id ?? id)">{{ label }}</Label>
    <Select :model-value="selected" :disabled="disabled" @update:model-value="update">
      <SelectTrigger
        v-bind="{ ...attrs, class: undefined }"
        :id="String(attrs.id ?? id)"
        :aria-describedby="hint ? hintId : undefined"
        class="w-full"
        ><SelectValue
      /></SelectTrigger>
      <SelectContent
        ><SelectGroup
          ><ShadcnSelectItem
            v-for="(item, index) in items"
            :key="index"
            :value="`option-${index}`"
            >{{ item.label }}</ShadcnSelectItem
          ></SelectGroup
        ></SelectContent
      >
    </Select>
    <HintText v-if="hint" :id="hintId">{{ hint }}</HintText>
  </Field>
</template>
