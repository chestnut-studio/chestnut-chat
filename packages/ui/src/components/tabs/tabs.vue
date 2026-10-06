<script setup lang="ts">
import { Tabs } from "../ui/tabs";
export interface TabsProps {
  modelValue: string;
  orientation?: "horizontal" | "vertical";
}
withDefaults(defineProps<TabsProps>(), { orientation: "horizontal" });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <Tabs
    :model-value="modelValue"
    :orientation="orientation"
    class="w-full gap-4"
    @update:model-value="emit('update:modelValue', String($event))"
    ><slot
  /></Tabs>
</template>
