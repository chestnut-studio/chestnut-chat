<script setup lang="ts">
defineProps<{ text?: string; align?: "start" | "center" | "end" }>();
</script>

<template>
  <span class="group/tooltip relative inline-flex">
    <slot />
    <span
      class="pointer-events-none absolute top-full z-50 mt-1.5 hidden max-w-72 rounded-md border border-border-button-default bg-background-primary-default px-2 py-1 text-caption-1-medium whitespace-normal text-text-primary shadow-dropdown group-hover/tooltip:block group-focus-within/tooltip:block"
      :class="
        align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
      "
      role="tooltip"
    >
      <slot name="content">{{ text }}</slot>
    </span>
  </span>
</template>
