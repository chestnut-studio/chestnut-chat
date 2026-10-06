<script setup lang="ts">
import { Badge } from "../ui/badge";
export interface BadgeProps {
  color?: "primary" | "neutral";
}
withDefaults(defineProps<BadgeProps>(), { color: "neutral" });
</script>
<template>
  <Badge :variant="color === 'primary' ? 'default' : 'secondary'"><slot /></Badge>
</template>
