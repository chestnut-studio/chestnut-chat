<script setup lang="ts">
import { computed, provide } from "vue";
import { cx } from "../../utils/cx";
import { tabsKey } from "./tabs-context";

/**
 * Underline tabs root. The tab strip sits on a 1px separator baseline; the
 * active tab paints a 2px accent-600 underline over it. Ported from BoardUI
 * components/base/tabs/tabs.tsx (MIT) — reimplemented on native elements with
 * roving-tabindex arrow-key navigation instead of react-aria-components.
 *
 *   <Tabs v-model="active">
 *     <TabList>
 *       <Tab value="a">A</Tab>
 *       <Tab value="b">B</Tab>
 *     </TabList>
 *     <TabPanel value="a">…</TabPanel>
 *     <TabPanel value="b">…</TabPanel>
 *   </Tabs>
 */

export interface TabsProps {
  modelValue: string;
  orientation?: "horizontal" | "vertical";
}

const props = withDefaults(defineProps<TabsProps>(), {
  orientation: "horizontal",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

provide(tabsKey, {
  selectedValue: () => props.modelValue,
  setValue: (value: string) => emit("update:modelValue", value),
  orientation: props.orientation,
});

const rootClasses = computed(() =>
  cx("flex w-full flex-col gap-4", props.orientation === "vertical" && "flex-row"),
);
</script>

<template>
  <div :class="rootClasses">
    <slot />
  </div>
</template>
