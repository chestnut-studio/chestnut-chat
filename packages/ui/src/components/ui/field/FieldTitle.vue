<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    data-slot="field-label"
    :class="
      cn(
        'flex w-fit items-center gap-2 text-body-2-regular leading-snug font-medium group-data-[disabled=true]/field:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
