<script setup lang="ts">
import type { Component } from "vue";
import { computed, inject } from "vue";
import { cx } from "../../utils/cx";
import { tabsKey, type TabsContext } from "./tabs-context";

/**
 * A single tab. Ported from BoardUI components/base/tabs/tabs.tsx (MIT).
 *
 *   tab    px 10, py 8, gap 10 (label ↔ count), Body 1 (14/20)
 *     active   text accent-600, Medium weight (underline lives in TabList)
 *     inactive text/primary, Regular weight
 *   count  optional trailing count badge
 */

export interface TabProps {
  value: string;
  disabled?: boolean;
  icon?: Component;
  count?: string | number;
}

const props = withDefaults(defineProps<TabProps>(), { disabled: false });

function useTabs(): TabsContext {
  const context = inject(tabsKey, undefined);
  if (!context) {
    throw new Error("<Tab> must be used inside a <Tabs>.");
  }
  return context;
}

const context = useTabs();

const isSelected = computed(() => context.selectedValue() === props.value);

function onClick() {
  if (!props.disabled) context.setValue(props.value);
}

const labelClasses = computed(() =>
  cx(
    "inline-flex items-center gap-1.5",
    isSelected.value ? "text-body-medium text-accent-600" : "text-body-regular text-text-primary",
  ),
);

const countClasses = computed(() =>
  cx(
    "inline-flex items-center justify-center rounded-sm px-1 py-px text-caption-1-medium whitespace-nowrap",
    isSelected.value
      ? "bg-tab-count-selected-background text-accent-600"
      : "bg-black/10 text-text-primary opacity-50",
  ),
);
</script>

<template>
  <div
    role="tab"
    :tabindex="isSelected ? 0 : -1"
    :aria-selected="isSelected"
    :data-selected="isSelected"
    :aria-disabled="disabled || undefined"
    class="relative inline-flex cursor-pointer items-center gap-2.5 px-2.5 py-2 whitespace-nowrap outline-none transition-colors duration-150 ease focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-border-focus-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
    @click="onClick"
  >
    <span :class="labelClasses">
      <component :is="icon" v-if="icon" class="size-4 shrink-0" aria-hidden="true" />
      <slot />
    </span>
    <span v-if="count != null" :class="countClasses">{{ count }}</span>
  </div>
</template>
