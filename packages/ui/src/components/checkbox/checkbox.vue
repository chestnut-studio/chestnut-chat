<script setup lang="ts">
import { useId } from "vue";
import { MinusIcon } from "@radix-icons/vue";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
export interface CheckboxProps {
  modelValue?: boolean;
  indeterminate?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
  value?: string;
  name?: string;
}
withDefaults(defineProps<CheckboxProps>(), { modelValue: false, size: "md" });
const emit = defineEmits<{ "update:modelValue": [value: boolean]; change: [value: boolean] }>();
const id = useId();
function update(value: boolean | "indeterminate") {
  emit("update:modelValue", value === true);
  emit("change", value === true);
}
</script>
<template>
  <div class="inline-flex items-center gap-2">
    <Checkbox
      :id="id"
      :model-value="indeterminate ? 'indeterminate' : modelValue"
      :disabled="disabled"
      :value="value"
      :name="name"
      :class="size === 'sm' ? 'size-3.5' : undefined"
      @update:model-value="update"
      ><template v-if="indeterminate" #default><MinusIcon class="size-3.5" /></template
    ></Checkbox>
    <Label v-if="$slots.default" :for="id"><slot /></Label>
  </div>
</template>
