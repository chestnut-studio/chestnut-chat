<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});

const route = useRoute();
const projectId = computed(() => route.params.projectId as string);
const chatId = computed(() => route.params.chatId as string);
</script>

<template>
  <ChatWorkspace :chat-id="chatId" :expected-project-id="projectId" />
</template>
