<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";
defineOptions({ inheritAttrs: false });
export interface PopoverProps {
  mode?: "click" | "hover";
  align?: "start" | "center" | "end";
  width?: string;
  openDelay?: number;
  closeDelay?: number;
}
const props = withDefaults(defineProps<PopoverProps>(), {
  mode: "click",
  align: "start",
  width: "w-max",
  openDelay: 150,
  closeDelay: 100,
});
const open = defineModel<boolean>("open", { default: false });
let timer: ReturnType<typeof setTimeout> | undefined;
function schedule(value: boolean) {
  if (props.mode !== "hover") return;
  clearTimeout(timer);
  timer = setTimeout(
    () => {
      open.value = value;
    },
    value ? props.openDelay : props.closeDelay,
  );
}
function update(value: boolean) {
  clearTimeout(timer);
  open.value = value;
}
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <Popover :open="open" @update:open="update">
    <PopoverTrigger
      as-child
      v-bind="$attrs"
      @mouseenter="schedule(true)"
      @mouseleave="schedule(false)"
      @focusin="mode === 'hover' && update(true)"
      ><slot
    /></PopoverTrigger>
    <PopoverContent
      :align="align"
      side="bottom"
      :class="cn('p-0', width)"
      @mouseenter="schedule(true)"
      @mouseleave="schedule(false)"
      @open-auto-focus="mode === 'hover' && $event.preventDefault()"
    >
      <slot name="content" :close="() => update(false)" />
    </PopoverContent>
  </Popover>
</template>
