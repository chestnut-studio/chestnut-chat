<script setup lang="ts">
import type { SelectTriggerProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import RiIcon from "../../icon/ri-icon.vue";
import { reactiveOmit } from "@vueuse/core";
import { SelectIcon, SelectTrigger, useForwardProps } from "reka-ui";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = withDefaults(
  defineProps<SelectTriggerProps & { class?: HTMLAttributes["class"]; size?: "sm" | "default" }>(),
  { size: "default" },
);

const delegatedProps = reactiveOmit(props, "class", "size");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-size="size"
    v-bind="forwardedProps"
    :class="
      cn(
        `border-border-button-default data-[placeholder]:text-text-placeholder [&_svg:not([class*='text-'])]:text-foreground-icon-secondary focus-visible:border-border-focus-ring focus-visible:ring-border-focus-ring/30 aria-invalid:ring-border-error-default/20 aria-invalid:border-border-error-default bg-background-primary-default text-text-primary hover:border-border-button-hover flex w-fit items-center justify-between gap-2 rounded-xl border px-3 py-2 text-body-2-regular whitespace-nowrap shadow-card transition-[color,box-shadow,border-color] outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-input-disabled-background disabled:text-input-disabled-text data-[size=default]:h-10 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
        props.class,
      )
    "
  >
    <slot />
    <SelectIcon as-child>
      <RiIcon name="arrow-down-s-line" class="size-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>
</template>
