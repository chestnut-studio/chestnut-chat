<script setup lang="ts">
import type { AvatarFallbackProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { AvatarFallback } from "reka-ui";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = withDefaults(
  defineProps<
    AvatarFallbackProps & {
      class?: HTMLAttributes["class"];
      color?: "neutral" | "blue" | "lime" | "pink";
    }
  >(),
  { color: "neutral" },
);
const colors = {
  neutral: "bg-muted text-muted-foreground",
  blue: "bg-primary/15 text-primary",
  lime: "bg-chart-2/15 text-chart-2",
  pink: "bg-chart-5/15 text-chart-5",
} as const;

const delegatedProps = reactiveOmit(props, "class", "color");
</script>

<template>
  <AvatarFallback
    data-slot="avatar-fallback"
    v-bind="delegatedProps"
    :class="
      cn('flex size-full items-center justify-center rounded-full', colors[color], props.class)
    "
  >
    <slot />
  </AvatarFallback>
</template>
