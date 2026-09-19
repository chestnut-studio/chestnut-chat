<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from "vue";
import CloseButton from "../button/close-button.vue";

export interface ModalProps {
  title?: string;
  description?: string;
  size?: "md" | "lg";
}

withDefaults(defineProps<ModalProps>(), { size: "md" });

const open = defineModel<boolean>("open", { default: false });
const dialog = useTemplateRef<HTMLDialogElement>("dialog");
const titleId = useId();
const descriptionId = useId();

async function syncDialog(value: boolean) {
  await nextTick();
  if (value && !dialog.value?.open) dialog.value?.showModal();
  if (!value && dialog.value?.open) dialog.value.close();
}

function close() {
  open.value = false;
}

function onBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) close();
}

watch(open, syncDialog, { flush: "post" });
onMounted(() => syncDialog(open.value));
onBeforeUnmount(() => dialog.value?.close());
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 text-text-primary shadow-xl backdrop:bg-black/60"
      :class="size === 'lg' ? 'max-w-2xl' : 'max-w-lg'"
      :aria-labelledby="title ? titleId : undefined"
      :aria-describedby="description ? descriptionId : undefined"
      @cancel.prevent="close"
      @close="open = false"
      @click="onBackdrop"
    >
      <div role="document" @click.stop>
        <slot name="content" :close="close">
          <header
            v-if="title || description"
            class="flex items-start justify-between gap-4 border-b border-separator-border px-6 py-5"
          >
            <div class="min-w-0">
              <h2 v-if="title" :id="titleId" class="text-title-2-medium text-text-primary">
                {{ title }}
              </h2>
              <p
                v-if="description"
                :id="descriptionId"
                class="mt-1 text-body-regular text-text-secondary"
              >
                {{ description }}
              </p>
            </div>
            <CloseButton size="sm" aria-label="Close" @click="close" />
          </header>
          <div v-if="$slots.body || $slots.default" class="max-h-[70dvh] overflow-y-auto p-6">
            <slot name="body" :close="close"><slot /></slot>
          </div>
          <footer
            v-if="$slots.footer"
            class="flex justify-end gap-2 border-t border-separator-border px-6 py-4"
          >
            <slot name="footer" :close="close" />
          </footer>
        </slot>
      </div>
    </dialog>
  </Teleport>
</template>
