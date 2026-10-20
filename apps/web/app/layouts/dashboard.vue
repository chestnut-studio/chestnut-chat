<script setup lang="ts">
import { PanelLeftClose } from "~/utils/icons";
import { SidebarProvider, SidebarTrigger } from "@chestnut-chat/ui/components/ui/sidebar";

const { open: loginOpen } = useLoginModal();
const { open: settingsOpen, page: settingsPage } = useSettingsModal();
const sidebarOpen = useCookie<boolean>("sidebar_state", {
  default: () => true,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
});
</script>

<template>
  <SidebarProvider
    v-model:open="sidebarOpen"
    class="h-svh min-h-0 overflow-hidden bg-background-full"
    :style="{ '--sidebar-width': '18rem', '--sidebar-width-icon': '4rem' }"
  >
    <SidebarTrigger class="fixed left-3 top-3 z-30 md:hidden" aria-label="Open navigation">
      <PanelLeftClose />
    </SidebarTrigger>
    <ChatSidebar />
    <slot />
  </SidebarProvider>
  <SettingsModal v-model:open="settingsOpen" v-model:page="settingsPage" />
  <LoginModal v-model:open="loginOpen" />
</template>
