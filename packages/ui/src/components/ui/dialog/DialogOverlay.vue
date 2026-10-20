<script setup lang="ts">
import type { DialogOverlayProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { DialogOverlay } from "reka-ui";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <DialogOverlay
    data-slot="dialog-overlay"
    v-bind="delegatedProps"
    :class="
      cn(
        'data-[state=open]:animate-overlay-in data-[state=closed]:opacity-0 fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity',
        props.class,
      )
    "
  >
    <slot />
  </DialogOverlay>
</template>
