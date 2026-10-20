<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    data-slot="input-group"
    role="group"
    :class="
      cn(
        'group/input-group border-border-button-default bg-background-primary-default hover:border-border-button-hover relative flex w-full items-center rounded-xl border shadow-card transition-[color,box-shadow,border-color] outline-none',
        'h-10 min-w-0 has-[>textarea]:h-auto',

        // Variants based on alignment.
        'has-[>[data-align=inline-start]]:[&>input]:pl-2',
        'has-[>[data-align=inline-end]]:[&>input]:pr-2',
        'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
        'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',

        // Focus state.
        'has-[[data-slot=input-group-control]:focus-visible]:border-border-focus-ring has-[[data-slot=input-group-control]:focus-visible]:ring-border-focus-ring/30 has-[[data-slot=input-group-control]:focus-visible]:ring-2',

        // Error state.
        'has-[[data-slot][aria-invalid=true]]:ring-border-error-default/20 has-[[data-slot][aria-invalid=true]]:border-border-error-default',

        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
