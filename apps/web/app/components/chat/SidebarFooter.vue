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
const route = useRoute();
const isDark = computed(() => colorMode.value === "dark");

function toggleColorMode() {
  colorMode.preference = isDark.value ? "light" : "dark";
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        :tooltip="t(isDark ? 'settings.light' : 'settings.dark')"
        :aria-label="t(isDark ? 'settings.light' : 'settings.dark')"
        @click="toggleColorMode"
      >
        <component :is="isDark ? Sun : Moon" />
        <span v-if="!collapsed">{{ t(isDark ? "settings.light" : "settings.dark") }}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton
        as-child
        :is-active="route.path.startsWith('/settings')"
        :tooltip="t('settings.title')"
      >
        <NuxtLink to="/settings" :aria-label="t('settings.title')">
          <Settings2 />
          <span v-if="!collapsed">{{ t("settings.title") }}</span>
        </NuxtLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
