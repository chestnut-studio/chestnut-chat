<script setup lang="ts">
import type { Component } from "vue";
import Popover from "../overlay/popover.vue";

export interface DropdownItem {
  label: string;
  icon?: Component | string;
  color?: "danger" | "default";
  disabled?: boolean;
  to?: string;
  onSelect?: () => void;
  iconProvider?: string;
}

defineProps<{ items: DropdownItem[] | DropdownItem[][]; align?: "start" | "end" }>();

function groups(items: DropdownItem[] | DropdownItem[][]): DropdownItem[][] {
  return items.length > 0 && Array.isArray(items[0])
    ? (items as DropdownItem[][])
    : [items as DropdownItem[]];
}
</script>

<template>
  <Popover :align="align ?? 'end'" width="min-w-48">
    <slot />
    <template #content="{ close }">
      <div class="p-1.5">
        <div
          v-for="(group, groupIndex) in groups(items)"
          :key="groupIndex"
          class="border-separator-border py-1 first:pt-0 last:pb-0 not-last:border-b"
        >
          <component
            :is="item.to ? 'a' : 'button'"
            v-for="item in group"
            :key="item.label"
            :href="item.to"
            type="button"
            :disabled="item.disabled"
            class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-body-regular transition-colors duration-150 hover:bg-background-secondary-hover disabled:opacity-50"
            :class="item.color === 'danger' ? 'text-text-error-primary' : 'text-text-primary'"
            @click="
              item.onSelect?.();
              close();
            "
          >
            <slot name="item-leading" :item="item">
              <component
                :is="item.icon"
                v-if="item.icon && typeof item.icon !== 'string'"
                class="size-4 shrink-0"
              />
            </slot>
            <span>{{ item.label }}</span>
          </component>
        </div>
      </div>
    </template>
  </Popover>
</template>
