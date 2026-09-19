<script setup lang="ts">
import { Menu } from "lucide-vue-next";
import { BIconButton } from "@chestnut-chat/ui";

const { open: loginOpen } = useLoginModal();
const mobileSidebarOpen = ref(false);
</script>

<template>
  <div class="flex h-svh min-h-0 overflow-hidden bg-background-full">
    <BIconButton
      class="fixed left-3 top-3 z-30 sm:hidden"
      variant="secondary"
      :icon="Menu"
      aria-label="Open navigation"
      @click="mobileSidebarOpen = true"
    />
    <ChatSidebar v-model:mobile-open="mobileSidebarOpen" />
    <slot />
  </div>
  <LoginModal v-model:open="loginOpen" />
</template>
