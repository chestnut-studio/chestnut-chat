<script setup lang="ts">
import type { SelectItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import RiIcon from "../../icon/ri-icon.vue";
import { reactiveOmit } from "@vueuse/core";
import { SelectItem, SelectItemIndicator, SelectItemText, useForwardProps } from "reka-ui";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<SelectItemProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <SelectItem
    data-slot="select-item"
    v-bind="forwardedProps"
    :class="
      cn(
        `focus:bg-dropdown-item-hover-background focus:text-text-primary [&_svg:not([class*='text-'])]:text-foreground-icon-secondary relative flex w-full cursor-default items-center gap-2 rounded-lg py-1.5 pr-8 pl-2 text-body-2-regular outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:text-text-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2`,
        props.class,
      )
    "
  >
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectItemIndicator>
        <slot name="indicator-icon">
          <RiIcon name="check-line" class="size-4" />
        </slot>
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
