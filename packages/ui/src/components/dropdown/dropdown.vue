<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { cn } from "../../lib/utils";
import RiIcon from "../icon/ri-icon.vue";
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
  /** A component, or a Remix icon name such as `i-ri-pencil-line`. */
  icon?: Component | string;
  color?: "danger" | "default";
  disabled?: boolean;
  /** Highlights the row and shows a trailing check (current selection). */
  selected?: boolean;
  to?: string;
  onSelect?: () => void;
  iconProvider?: string;
}

const props = withDefaults(
  defineProps<{
    items: DropdownItem[] | DropdownItem[][];
    align?: "start" | "end";
    content?: {
      align?: "start" | "center" | "end";
      side?: "top" | "bottom" | "left" | "right";
      sideOffset?: number;
    };
    ui?: { content?: string };
  }>(),
  { align: "end" },
);

const groups = computed(() =>
  Array.isArray(props.items[0])
    ? (props.items as DropdownItem[][])
    : [props.items as DropdownItem[]],
);

function remixName(icon: string) {
  return icon.replace(/^i-ri-/, "");
}

function select(item: DropdownItem) {
  if (item.disabled) return;
  item.onSelect?.();
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child v-bind="$attrs"><slot /></DropdownMenuTrigger>
    <DropdownMenuContent
      :align="content?.align ?? align"
      :side="content?.side"
      :side-offset="content?.sideOffset"
      :class="
        cn('flex w-[266px] max-w-[calc(100vw-32px)] flex-col gap-1 rounded-2xl p-2.5', ui?.content)
      "
    >
      <template v-for="(group, groupIndex) in groups" :key="groupIndex">
        <DropdownMenuSeparator
          v-if="groupIndex"
          class="-mx-2.5 my-1.5 w-auto shrink-0 bg-border-button-default"
        />
        <DropdownMenuGroup class="flex w-full flex-col gap-1">
          <DropdownMenuItem
            v-for="item in group"
            :key="item.label"
            :as="item.to ? 'a' : 'div'"
            :href="item.disabled ? undefined : item.to"
            :disabled="item.disabled"
            :aria-checked="item.selected"
            :class="
              cn(
                'w-full gap-2 rounded-2lg p-2 text-body-medium text-text-primary transition-colors focus:bg-dropdown-item-hover-background focus:text-text-primary',
                item.selected && 'bg-dropdown-item-hover-background',
                item.color === 'danger' &&
                  'text-text-error-primary focus:bg-dropdown-item-hover-background focus:text-text-error-primary [&_svg:not([class*=text-])]:text-foreground-icon-error',
              )
            "
            @select="select(item)"
          >
            <slot name="item-leading" :item="item">
              <component
                :is="item.icon"
                v-if="item.icon && typeof item.icon !== 'string'"
                class="size-5 shrink-0 text-foreground-icon-secondary"
                aria-hidden="true"
              />
              <RiIcon
                v-else-if="item.icon"
                :name="remixName(item.icon)"
                class="size-5 shrink-0 text-foreground-icon-secondary"
              />
            </slot>
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <RiIcon
              v-if="item.selected"
              name="check-line"
              class="size-5 shrink-0 text-foreground-icon-secondary"
            />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
