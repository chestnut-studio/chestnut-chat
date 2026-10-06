<script setup lang="ts">
import { useId } from "vue";
import { Field, FieldDescription } from "../ui/field";
import Label from "./label.vue";
defineProps<{ label: string; description?: string; hint?: string; required?: boolean }>();
const id = useId();
</script>
<template>
  <Field class="gap-1.5">
    <div class="flex items-center justify-between gap-2">
      <Label :for="id" :is-required="required">{{ label }}</Label>
      <span v-if="hint" class="text-xs text-muted-foreground">{{ hint }}</span>
    </div>
    <FieldDescription v-if="description">{{ description }}</FieldDescription>
    <slot :id="id" />
  </Field>
</template>
