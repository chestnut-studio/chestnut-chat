<script setup lang="ts">
import type { TooltipContentEmits, TooltipContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { TooltipArrow, TooltipContent, TooltipPortal, useForwardPropsEmits } from "reka-ui";
import { cn } from "@chestnut-chat/ui/lib/utils";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<TooltipContentProps & { class?: HTMLAttributes["class"] }>(),
  {
    sideOffset: 4,
  },
);

const emits = defineEmits<TooltipContentEmits>();

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      data-slot="tooltip-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'bg-text-primary text-background-full data-[state=open]:animate-blur-in data-[state=closed]:animate-blur-out z-50 w-fit rounded-lg px-3 py-1.5 text-caption-1-medium text-balance',
          props.class,
        )
      "
    >
      <slot />

      <TooltipArrow
        class="bg-text-primary fill-text-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-xs"
      />
    </TooltipContent>
  </TooltipPortal>
</template>
