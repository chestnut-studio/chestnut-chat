<script setup lang="ts">
import type { TabsTriggerProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { TabsTrigger, useForwardProps } from "reka-ui";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    :class="
      cn(
        `data-[state=active]:bg-segmented-control-selected-background data-[state=active]:text-text-primary data-[state=active]:shadow-card focus-visible:ring-2 focus-visible:ring-border-focus-ring text-text-secondary hover:text-text-primary inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-body-2-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:text-text-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot />
  </TabsTrigger>
</template>
