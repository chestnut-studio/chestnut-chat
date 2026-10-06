<script setup lang="ts">
import type { Component } from "vue";
import { Button } from "../ui/button";
export interface IconButtonProps {
  icon: Component;
  size?: "medium" | "small";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}
withDefaults(defineProps<IconButtonProps>(), { size: "medium", type: "button" });
</script>
<template>
  <Button
    variant="outline"
    :size="size === 'small' ? 'icon-sm' : 'icon'"
    :type="type"
    :disabled="disabled"
  >
    <component :is="icon" aria-hidden="true" />
  </Button>
</template>
