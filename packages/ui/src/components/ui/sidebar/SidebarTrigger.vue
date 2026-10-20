<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import RiIcon from "../../icon/ri-icon.vue";
import { cn } from "@chestnut-chat/ui/lib/utils";
import { Button } from "@chestnut-chat/ui/components/ui/button";
import { useSidebar } from "./utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const { toggleSidebar } = useSidebar();
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon"
    :class="cn('h-7 w-7', props.class)"
    @click="toggleSidebar"
  >
    <slot><RiIcon name="side-bar-line" /></slot>
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
