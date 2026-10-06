<script setup lang="ts">
import { ButtonGroup } from "../ui/button-group";
export interface ButtonGroupProps {
  size?: "medium" | "small";
}
withDefaults(defineProps<ButtonGroupProps>(), { size: "medium" });
</script>
<template>
  <ButtonGroup :data-size="size"><slot /></ButtonGroup>
</template>
