<script setup lang="ts">
import type { Component } from "vue";
import Button from "./button.vue";
export interface ButtonGroupItemProps {
  size?: "medium" | "small";
  selected?: boolean;
  iconOnly?: boolean;
  leadingIcon?: Component;
  trailingIcon?: Component;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}
withDefaults(defineProps<ButtonGroupItemProps>(), { size: "medium", type: "button" });
</script>
<template>
  <Button
    variant="secondary"
    :size="size"
    :icon-only="iconOnly"
    :leading-icon="leadingIcon"
    :trailing-icon="trailingIcon"
    :type="type"
    :disabled="disabled"
    :aria-pressed="selected"
    :data-selected="selected"
    class="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    ><slot
  /></Button>
</template>
