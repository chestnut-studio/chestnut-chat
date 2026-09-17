<script setup lang="ts">
import { LogIn } from "lucide-vue-next";
import { BAvatar, BButton } from "@chestnut-chat/ui";
import type { DropdownMenuItem } from "@nuxt/ui";

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

const menuItems = computed<DropdownMenuItem[][]>(() => [
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
      color: "error",
      onSelect: signOut,
    },
  ],
]);
</script>

<template>
  <div class="w-full">
    <USkeleton v-if="!hydrated || authSession.isPending" class="h-9 w-full" />

    <UDropdownMenu
      v-else-if="authSession.data"
      :items="menuItems"
      class="w-full"
      :ui="{ content: 'min-w-52' }"
    >
      <BButton variant="ghost" class="w-full justify-start">
        <BAvatar
          :src="authSession.data.user.image ?? undefined"
          :alt="authSession.data.user.name"
          :initials="authSession.data.user.name?.charAt(0)"
          size="sm"
        />
        <span v-if="!collapsed" class="min-w-0 truncate">{{ authSession.data.user.name }}</span>
      </BButton>
    </UDropdownMenu>

    <BButton
      v-else
      variant="secondary"
      class="w-full"
      :icon-only="collapsed"
      :leading-icon="LogIn"
      :aria-label="collapsed ? $t('sidebar.signIn') : undefined"
      @click="showLogin"
    >
      <span v-if="!collapsed">{{ $t("sidebar.signIn") }}</span>
    </BButton>
  </div>
</template>
