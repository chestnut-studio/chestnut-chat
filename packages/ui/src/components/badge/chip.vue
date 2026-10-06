<script setup lang="ts">
import { Badge } from "../ui/badge";
export interface ChipProps {
  variant?: "bold" | "subtle" | "caption";
  color?: "lime" | "rose" | "yellow" | "cyan" | "blue" | "purple" | "neutral" | "gray" | "soft";
}
withDefaults(defineProps<ChipProps>(), { variant: "bold", color: "neutral" });
const variants = {
  lime: "success",
  rose: "destructive",
  yellow: "warning",
  cyan: "cyan",
  blue: "info",
  purple: "purple",
  neutral: "secondary",
  gray: "outline",
  soft: "secondary",
} as const;
</script>
<template>
  <Badge
    :variant="variants[color]"
    :class="variant === 'subtle' ? 'py-1' : undefined"
    :data-emphasis="variant"
    :data-color="color"
    ><slot
  /></Badge>
</template>
