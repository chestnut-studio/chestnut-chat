<script setup lang="ts">
const { open: loginOpen } = useLoginModal();
</script>

<template>
  <UDashboardGroup storage="cookie" storage-key="chestnut-dashboard">
    <ChatSidebar />
    <slot />
  </UDashboardGroup>
  <LoginModal v-model:open="loginOpen" />
</template>
