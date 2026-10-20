<script setup lang="ts">
import { Moon, Settings2, Sun } from "~/utils/icons";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@chestnut-chat/ui/components/ui/sidebar";

defineProps<{
  collapsed?: boolean;
}>();

const colorMode = useColorMode();
const { t } = useI18n();
const { open: settingsOpen, show: showSettings } = useSettingsModal();
const isDark = computed(() => colorMode.value === "dark");

function toggleColorMode() {
  colorMode.preference = isDark.value ? "light" : "dark";
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem v-if="!collapsed">
      <ChatModeSwitcher />
    </SidebarMenuItem>
    <SidebarMenuItem v-else>
      <SidebarMenuButton
        :tooltip="t(isDark ? 'settings.light' : 'settings.dark')"
        :aria-label="t(isDark ? 'settings.light' : 'settings.dark')"
        @click="toggleColorMode"
      >
        <component :is="isDark ? Sun : Moon" />
      </SidebarMenuButton>
    </SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton
        :is-active="settingsOpen"
        :tooltip="t('settings.title')"
        :aria-label="t('settings.title')"
        @click="showSettings()"
      >
        <Settings2 />
        <span v-if="!collapsed">{{ t("settings.title") }}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
