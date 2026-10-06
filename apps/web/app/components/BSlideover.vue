<script setup lang="ts">
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@chestnut-chat/ui/components/ui/sheet";

defineProps<{ title: string; description?: string }>();
const open = defineModel<boolean>("open", { default: false });
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent class="w-full sm:max-w-md">
      <SheetHeader class="pr-10">
        <SheetTitle>{{ title }}</SheetTitle>
        <SheetDescription v-if="description">{{ description }}</SheetDescription>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <slot name="body"><slot /></slot>
      </div>
    </SheetContent>
  </Sheet>
</template>
