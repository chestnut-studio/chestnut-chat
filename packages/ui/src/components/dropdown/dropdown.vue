<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
defineOptions({ inheritAttrs: false });
export interface DropdownItem {
  label: string;
  icon?: Component | string;
  color?: "danger" | "default";
  disabled?: boolean;
  to?: string;
  onSelect?: () => void;
  iconProvider?: string;
}
const props = withDefaults(
  defineProps<{ items: DropdownItem[] | DropdownItem[][]; align?: "start" | "end" }>(),
  { align: "end" },
);
const groups = computed(() =>
  Array.isArray(props.items[0])
    ? (props.items as DropdownItem[][])
    : [props.items as DropdownItem[]],
);
function select(item: DropdownItem) {
  if (item.disabled) return;
  item.onSelect?.();
}
</script>
<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child v-bind="$attrs"><slot /></DropdownMenuTrigger>
    <DropdownMenuContent :align="align" class="min-w-48">
      <template v-for="(group, groupIndex) in groups" :key="groupIndex">
        <DropdownMenuSeparator v-if="groupIndex" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            v-for="item in group"
            :key="item.label"
            :as="item.to ? 'a' : 'div'"
            :href="item.disabled ? undefined : item.to"
            :disabled="item.disabled"
            :variant="item.color === 'danger' ? 'destructive' : 'default'"
            @select="select(item)"
          >
            <slot name="item-leading" :item="item"
              ><component
                :is="item.icon"
                v-if="item.icon && typeof item.icon !== 'string'"
                aria-hidden="true"
            /></slot>
            <span>{{ item.label }}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
