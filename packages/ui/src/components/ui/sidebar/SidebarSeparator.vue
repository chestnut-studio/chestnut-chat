<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@chestnut-chat/ui/lib/utils";
import { Separator } from "@chestnut-chat/ui/components/ui/separator";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <Separator
    data-slot="sidebar-separator"
    data-sidebar="separator"
    :class="cn('bg-sidebar-border mx-2 data-[orientation=horizontal]:w-auto', props.class)"
  >
    <slot />
  </Separator>
</template>
