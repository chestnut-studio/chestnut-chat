<script setup lang="ts">
import { BCloseButton } from "@chestnut-chat/ui";

defineProps<{ title: string; description?: string }>();
const open = defineModel<boolean>("open", { default: false });
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex justify-end bg-black/60"
      @click.self="open = false"
    >
      <aside
        class="flex h-full w-full max-w-md flex-col border-l border-border-button-default bg-background-primary-default shadow-xl"
      >
        <header class="flex items-start justify-between gap-4 border-b border-separator-border p-5">
          <div>
            <h2 class="text-title-2-medium text-text-primary">{{ title }}</h2>
            <p v-if="description" class="mt-1 text-body-regular text-text-secondary">
              {{ description }}
            </p>
          </div>
          <BCloseButton aria-label="Close" @click="open = false" />
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto p-5">
          <slot name="body"><slot /></slot>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
