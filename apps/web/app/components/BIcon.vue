<script setup lang="ts">
const props = defineProps<{ name: string }>();

const iconName = computed(() =>
  props.name.replace(/^i-ri-/, "ri:").replace(/^i-simple-icons-/, "simple-icons:"),
);
</script>

<template>
  <Icon :name="iconName" />
</template>
