<script setup lang="ts">
export interface StatusDotProps {
  color?: "green" | "yellow" | "indigo";
}
withDefaults(defineProps<StatusDotProps>(), { color: "green" });
const colors = {
  green: "bg-chart-2/20 [&>span]:bg-chart-2",
  yellow: "bg-chart-4/20 [&>span]:bg-chart-4",
  indigo: "bg-primary/20 [&>span]:bg-primary",
} as const;
</script>
<template>
  <span
    aria-hidden="true"
    :data-color="color"
    :class="colors[color]"
    class="inline-flex size-3 shrink-0 items-center justify-center rounded-full"
    ><span class="size-1.5 rounded-full"
  /></span>
</template>
