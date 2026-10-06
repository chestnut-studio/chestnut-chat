<script setup lang="ts">
import { Label } from "../ui/label";
export interface LabelProps {
  isRequired?: boolean;
  for?: string;
}
defineProps<LabelProps>();
</script>
<template>
  <Label :for="for"
    ><slot /><span v-if="isRequired" aria-hidden="true" class="text-destructive">*</span></Label
  >
</template>
