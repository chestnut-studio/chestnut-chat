<script setup lang="ts">
import { computed, inject } from "vue";
import { tabsKey } from "./tabs-context";

/**
 * Panel for a Tab. Ported from BoardUI components/base/tabs/tabs.tsx (MIT).
 * Hidden with `hidden` (not v-if) so consumers can keep panel state alive.
 */

export interface TabPanelProps {
  value: string;
}

const props = defineProps<TabPanelProps>();

const context = inject(tabsKey, undefined);

if (!context) {
  throw new Error("<TabPanel> must be used inside a <Tabs>.");
}

const isSelected = computed(() => context.selectedValue() === props.value);
</script>

<template>
  <div
    v-show="isSelected"
    role="tabpanel"
    class="outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-border-focus-ring"
  >
    <slot />
  </div>
</template>
