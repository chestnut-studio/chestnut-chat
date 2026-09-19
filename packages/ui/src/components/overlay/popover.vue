<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";

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
const root = useTemplateRef<HTMLElement>("root");
let timer: ReturnType<typeof setTimeout> | undefined;

const alignClass = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
} as const;

function toggle() {
  if (props.mode === "click") open.value = !open.value;
}

function schedule(value: boolean) {
  if (props.mode !== "hover") return;
  clearTimeout(timer);
  timer = setTimeout(() => (open.value = value), value ? props.openDelay : props.closeDelay);
}

function onDocumentClick(event: MouseEvent) {
  if (props.mode === "click" && !root.value?.contains(event.target as Node)) open.value = false;
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => {
  clearTimeout(timer);
  document.removeEventListener("click", onDocumentClick);
});
</script>

<template>
  <span
    ref="root"
    class="relative inline-flex"
    @mouseenter="schedule(true)"
    @mouseleave="schedule(false)"
  >
    <span class="inline-flex" @click="toggle"><slot /></span>
    <span
      v-if="open"
      class="absolute top-full z-50 mt-2 overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default shadow-dropdown"
      :class="[alignClass[align], width]"
      @click.stop
    >
      <slot name="content" :close="() => (open = false)" />
    </span>
  </span>
</template>
