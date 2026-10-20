<script setup lang="ts">
import type { ContextMenuContentEmits, ContextMenuContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuContent, ContextMenuPortal, useForwardPropsEmits } from "reka-ui";
import { cn } from "@chestnut-chat/ui/lib/utils";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<ContextMenuContentProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<ContextMenuContentEmits>();

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <ContextMenuPortal>
    <ContextMenuContent
      data-slot="context-menu-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-background-primary-default text-text-primary data-[state=open]:animate-blur-in data-[state=closed]:animate-blur-out z-50 max-h-(--reka-context-menu-content-available-height) min-w-[8rem] origin-(--reka-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border border-border-button-default p-1 shadow-dropdown',
          props.class,
        )
      "
    >
      <slot />
    </ContextMenuContent>
  </ContextMenuPortal>
</template>
