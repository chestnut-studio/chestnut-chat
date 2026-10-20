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
    compact?: boolean;
  }>(),
  { align: "end", compact: false },
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
        cn(
          'flex max-w-[calc(100vw-32px)] flex-col gap-1',
          compact ? 'w-44 rounded-xl p-1' : 'w-[266px] rounded-2xl p-2.5',
          ui?.content,
        )
      "
    >
      <template v-for="(group, groupIndex) in groups" :key="groupIndex">
        <DropdownMenuSeparator
          v-if="groupIndex"
          :class="
            cn(
              'w-auto shrink-0 bg-border-button-default',
              compact ? '-mx-1 my-0.5' : '-mx-2.5 my-1.5',
            )
          "
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
                'w-full gap-2 text-text-primary transition-colors focus:bg-dropdown-item-hover-background focus:text-text-primary',
                compact
                  ? 'rounded-lg px-2 py-1.5 text-body-2-regular'
                  : 'rounded-2lg p-2 text-body-medium',
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
                :class="
                  cn('shrink-0 text-foreground-icon-secondary', compact ? 'size-4' : 'size-5')
                "
                aria-hidden="true"
              />
              <RiIcon
                v-else-if="item.icon"
                :name="remixName(item.icon)"
                :class="
                  cn('shrink-0 text-foreground-icon-secondary', compact ? 'size-4' : 'size-5')
                "
              />
            </slot>
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <RiIcon
              v-if="item.selected"
              name="check-line"
              :class="cn('shrink-0 text-foreground-icon-secondary', compact ? 'size-4' : 'size-5')"
            />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
