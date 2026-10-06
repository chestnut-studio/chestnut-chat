<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { shallowRef } from "vue";
defineOptions({ inheritAttrs: false });
const open = shallowRef(false);
withDefaults(defineProps<{ text?: string; align?: "start" | "center" | "end" }>(), {
  align: "center",
});
</script>
<template>
  <TooltipProvider :delay-duration="150">
    <Tooltip v-model:open="open">
      <TooltipTrigger as-child
        ><span
          v-bind="$attrs"
          class="inline-flex"
          tabindex="0"
          @focusin="open = true"
          @focusout="open = false"
          ><slot /></span
      ></TooltipTrigger>
      <TooltipContent :align="align" side="bottom" class="max-w-72"
        ><slot name="content">{{ text }}</slot></TooltipContent
      >
    </Tooltip>
  </TooltipProvider>
</template>
