<script setup lang="ts">
import { LogIn } from "lucide-vue-next";
import { BAvatar, BDropdown, BSkeleton, type DropdownItem } from "@chestnut-chat/ui";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@chestnut-chat/ui/components/ui/sidebar";

defineProps<{
  collapsed?: boolean;
}>();

const authSession = useAuthSession();
const { t } = useI18n();
const { show: showLogin } = useLoginModal();
const signOut = useSignOut();

const hydrated = ref(false);

onMounted(() => {
  hydrated.value = true;
  authSession.ensure();
});

const menuItems = computed<DropdownItem[][]>(() => [
  [
    {
      label: t("settings.title"),
      icon: "i-lucide-settings",
      to: "/settings",
    },
  ],
  [
    {
      label: t("settings.signOut"),
      icon: "i-lucide-log-out",
      color: "danger",
      onSelect: signOut,
    },
  ],
]);
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <BSkeleton v-if="!hydrated || authSession.isPending" class="h-9 w-full" />

      <BDropdown
        v-else-if="authSession.data"
        :items="menuItems"
        class="w-full"
        :ui="{ content: 'min-w-52' }"
      >
        <SidebarMenuButton size="lg" :aria-label="authSession.data.user.name">
          <BAvatar
            :src="authSession.data.user.image ?? undefined"
            :alt="authSession.data.user.name"
            :initials="authSession.data.user.name?.charAt(0)"
            size="sm"
          />
          <span v-if="!collapsed" class="min-w-0 truncate">{{ authSession.data.user.name }}</span>
        </SidebarMenuButton>
      </BDropdown>

      <SidebarMenuButton
        v-else
        variant="outline"
        :tooltip="$t('sidebar.signIn')"
        :aria-label="$t('sidebar.signIn')"
        @click="showLogin"
      >
        <LogIn />
        <span v-if="!collapsed">{{ $t("sidebar.signIn") }}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
