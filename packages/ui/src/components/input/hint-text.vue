<script setup lang="ts">
import { FieldDescription, FieldError } from "../ui/field";
export interface HintTextProps {
  isInvalid?: boolean;
  id?: string;
}
defineProps<HintTextProps>();
</script>
<template>
  <FieldError v-if="isInvalid" :id="id"><slot /></FieldError>
  <FieldDescription v-else :id="id"><slot /></FieldDescription>
</template>
