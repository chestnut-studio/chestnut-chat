<script setup lang="ts">
import RiIcon from "../icon/ri-icon.vue";
import { Button } from "../ui/button";
export interface CloseButtonProps {
  size?: "2xs" | "xs" | "sm" | "md";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}
withDefaults(defineProps<CloseButtonProps>(), { size: "xs", type: "button" });
const sizes = { "2xs": "size-4", xs: "size-5", sm: "size-6", md: "size-8" } as const;
</script>
<template>
  <Button
    variant="ghost"
    size="icon-xs"
    :class="sizes[size]"
    :type="type"
    :disabled="disabled"
    aria-label="Close"
    ><RiIcon name="close-line" aria-hidden="true"
  /></Button>
</template>
