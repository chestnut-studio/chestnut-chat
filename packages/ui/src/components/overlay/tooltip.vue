<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { shallowRef } from "vue";
defineOptions({ inheritAttrs: false });
const open = shallowRef(false);
withDefaults(
  defineProps<{
    text?: string;
    align?: "start" | "center" | "end";
    side?: "top" | "right" | "bottom" | "left";
    contentClass?: string;
  }>(),
  { align: "center", side: "bottom" },
);
</script>
<template>
  <TooltipProvider :delay-duration="150" :skip-delay-duration="300">
    <Tooltip v-model:open="open">
      <TooltipTrigger as-child
        ><span v-bind="$attrs" class="inline-flex" @focusin="open = true" @focusout="open = false"
          ><slot /></span
      ></TooltipTrigger>
      <TooltipContent
        :align="align"
        :side="side"
        :side-offset="8"
        :class="['max-w-72', contentClass]"
        ><slot name="content">{{ text }}</slot></TooltipContent
      >
    </Tooltip>
  </TooltipProvider>
</template>
