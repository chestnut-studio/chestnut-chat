<script setup lang="ts">
/**
 * Button group — a row of secondary-style buttons fused into one control:
 * shared 1px border container with radius/2lg and shadow/xs, items divided by
 * hairlines, only the outer corners rounded. Ported from BoardUI
 * components/base/buttons/button-group.tsx (MIT).
 *
 * Pair with ButtonGroupItem; each item reads its size from its own `size`
 * prop (they should match the group's).
 */

export interface ButtonGroupProps {
  size?: "medium" | "small";
}

withDefaults(defineProps<ButtonGroupProps>(), { size: "medium" });
</script>

<template>
  <div
    role="group"
    :data-size="size"
    class="inline-flex items-stretch isolate rounded-2lg border border-border-button-group bg-background-primary-default shadow-xs divide-x divide-border-button-default overflow-hidden"
  >
    <slot />
  </div>
</template>
