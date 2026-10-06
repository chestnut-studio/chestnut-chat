<script setup lang="ts">
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
export interface AvatarProps {
  size?: "xs" | "sm" | "md" | "lg";
  color?: "neutral" | "blue" | "lime" | "pink";
  src?: string;
  alt?: string;
  initials?: string;
}
withDefaults(defineProps<AvatarProps>(), { size: "md", color: "neutral" });
const sizes = { xs: "size-5", sm: "size-6", md: "size-8", lg: "size-9" } as const;
</script>
<template>
  <Avatar :class="sizes[size]" :data-color="color">
    <AvatarImage v-if="src" :src="src" :alt="alt ?? ''" />
    <AvatarFallback :color="color">{{ initials }}</AvatarFallback>
  </Avatar>
</template>
