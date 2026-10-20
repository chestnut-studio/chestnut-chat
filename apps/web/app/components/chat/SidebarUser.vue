<script setup lang="ts">
import { LogIn } from "~/utils/icons";
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
      icon: "i-ri-settings-3-line",
      to: "/settings",
    },
  ],
  [
    {
      label: t("settings.signOut"),
      icon: "i-ri-logout-box-r-line",
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
        <SidebarMenuButton
          class="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
          :aria-label="authSession.data.user.name"
        >
          <BAvatar
            :src="authSession.data.user.image ?? undefined"
            :alt="authSession.data.user.name"
            :initials="authSession.data.user.name?.charAt(0)"
            size="sm"
          />
          <span v-if="!collapsed" class="min-w-0 truncate text-body-semibold">{{
            authSession.data.user.name
          }}</span>
          <BIcon
            v-if="!collapsed"
            name="i-ri-expand-up-down-line"
            class="ml-auto text-text-tertiary"
          />
        </SidebarMenuButton>
      </BDropdown>

      <SidebarMenuButton
        v-else
        variant="outline"
        :aria-label="$t('sidebar.signIn')"
        @click="showLogin"
      >
        <LogIn />
        <span v-if="!collapsed">{{ $t("sidebar.signIn") }}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
