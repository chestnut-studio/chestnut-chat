<script setup lang="ts">
import type { Component } from "vue";
import ButtonLink from "./button-link.vue";
export interface IconLinkButtonProps {
  icon: Component;
  size?: "medium" | "small";
  href?: string;
  disabled?: boolean;
}
withDefaults(defineProps<IconLinkButtonProps>(), { size: "medium" });
</script>
<template>
  <ButtonLink
    variant="secondary"
    icon-only
    :leading-icon="icon"
    :size="size"
    :href="href"
    :disabled="disabled"
  />
</template>
