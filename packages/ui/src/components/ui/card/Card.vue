<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn(
        `bg-background-primary-default text-text-primary flex flex-col gap-6 rounded-3xl border border-border-button-default py-6 shadow-card`,
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
