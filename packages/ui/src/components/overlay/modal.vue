<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { cn } from "../../lib/utils";
import { useId } from "vue";
defineOptions({ inheritAttrs: false });
export interface ModalProps {
  title?: string;
  description?: string;
  size?: "md" | "lg";
}
withDefaults(defineProps<ModalProps>(), { size: "md" });
const open = defineModel<boolean>("open", { default: false });
const descriptionId = useId();
function close() {
  open.value = false;
}
</script>
<template>
  <Dialog v-model:open="open">
    <DialogContent
      v-bind="$attrs"
      :class="cn('max-h-[calc(100dvh-2rem)] overflow-y-auto', size === 'lg' && 'sm:max-w-2xl')"
      :aria-describedby="description && !$slots.content ? descriptionId : undefined"
    >
      <DialogTitle v-if="$slots.content || !title" class="sr-only">{{
        title || "Dialog"
      }}</DialogTitle>
      <slot name="content" :close="close">
        <DialogHeader v-if="title || description">
          <DialogTitle v-if="title">{{ title }}</DialogTitle>
          <DialogDescription v-if="description" :id="descriptionId">{{
            description
          }}</DialogDescription>
        </DialogHeader>
        <div v-if="$slots.body || $slots.default" class="min-h-0 overflow-y-auto">
          <slot name="body" :close="close"><slot /></slot>
        </div>
        <DialogFooter v-if="$slots.footer"><slot name="footer" :close="close" /></DialogFooter>
      </slot>
    </DialogContent>
  </Dialog>
</template>
