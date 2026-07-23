<script setup lang="ts">
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
      <UButton
        :avatar="{
          src: authSession.data.user.image ?? undefined,
          alt: authSession.data.user.name,
        }"
        :label="collapsed ? undefined : authSession.data.user.name"
        color="neutral"
        variant="ghost"
        class="w-full"
        :block="collapsed"
      />
    </UDropdownMenu>

    <UButton
      v-else
      :label="collapsed ? undefined : $t('sidebar.signIn')"
      icon="i-lucide-log-in"
      color="neutral"
      variant="outline"
      block
      :square="collapsed"
      @click="showLogin"
    />
  </div>
</template>
