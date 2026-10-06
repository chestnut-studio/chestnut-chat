<script setup lang="ts">
import { Separator } from "../ui/separator";
import { cn } from "../../lib/utils";
export interface DividerProps {
  variant?: "single" | "double" | "fill";
  align?: "start" | "center" | "end";
}
withDefaults(defineProps<DividerProps>(), { variant: "single", align: "center" });
const alignments = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const;
</script>
<template>
  <Separator v-if="!$slots.default && variant === 'single'" />
  <div v-else-if="variant === 'double'" class="flex w-full flex-col gap-2">
    <Separator />
    <div v-if="$slots.default" :class="cn('flex text-sm text-muted-foreground', alignments[align])">
      <slot />
    </div>
    <Separator />
  </div>
  <div
    v-else-if="variant === 'fill'"
    :class="
      cn(
        'flex min-h-2 w-full rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground',
        alignments[align],
      )
    "
  >
    <slot />
  </div>
  <div v-else class="flex w-full items-center gap-3">
    <Separator v-if="align !== 'start'" class="min-w-0 flex-1" />
    <span class="shrink-0 text-sm text-muted-foreground"><slot /></span>
    <Separator v-if="align !== 'end'" class="min-w-0 flex-1" />
  </div>
</template>
