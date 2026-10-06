<script setup lang="ts">
import type { Component } from "vue";
import { Button } from "../ui/button";
export interface LinkButtonProps {
  variant?: "primary" | "secondary";
  size?: "medium" | "small" | "xs";
  leadingIcon?: Component;
  trailingIcon?: Component;
  href?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}
withDefaults(defineProps<LinkButtonProps>(), {
  variant: "primary",
  size: "medium",
  type: "button",
});
const sizes = { medium: "default", small: "sm", xs: "xs" } as const;
</script>
<template>
  <Button
    :as="href !== undefined ? 'a' : 'button'"
    :variant="variant === 'secondary' ? 'muted-link' : 'link'"
    :size="sizes[size]"
    :href="disabled ? undefined : href"
    :type="href !== undefined ? undefined : type"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : undefined"
    class="px-0 aria-disabled:pointer-events-none aria-disabled:opacity-50"
    @click="disabled && $event.preventDefault()"
  >
    <component :is="leadingIcon" v-if="leadingIcon" data-icon="inline-start" aria-hidden="true" />
    <slot />
    <component :is="trailingIcon" v-if="trailingIcon" data-icon="inline-end" aria-hidden="true" />
  </Button>
</template>
