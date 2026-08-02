<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});

const route = useRoute();
const chatId = computed(() => route.params.id as string);
</script>

<template>
  <ChatWorkspace :chat-id="chatId" />
</template>
