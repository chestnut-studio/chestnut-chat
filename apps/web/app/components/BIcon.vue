<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<template>
  <Icon :name="name.replace('i-lucide-', 'lucide:').replace('i-simple-icons-', 'simple-icons:')" />
</template>
