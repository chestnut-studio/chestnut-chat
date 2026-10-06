<script setup lang="ts">
export interface RadioDotProps {
  selected?: boolean;
  size?: "sm" | "md";
  focusVisible?: boolean;
}
withDefaults(defineProps<RadioDotProps>(), { size: "sm" });
</script>
<template>
  <span
    aria-hidden="true"
    :data-selected="selected"
    :data-focus="focusVisible"
    :class="size === 'sm' ? 'size-3.5' : 'size-4'"
    class="inline-flex shrink-0 items-center justify-center rounded-full border border-input text-primary data-[focus=true]:ring-2 data-[focus=true]:ring-ring"
    ><span v-if="selected" class="size-1.5 rounded-full bg-primary"
  /></span>
</template>
