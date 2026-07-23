<script setup lang="ts">
const authSession = useAuthSession();
const signOut = useSignOut();
const { show: showLogin } = useLoginModal();
const hydrated = ref(false);

onMounted(() => {
  hydrated.value = true;
  authSession.ensure();
});
</script>

<template>
  <div>
    <USkeleton v-if="!hydrated || authSession.isPending" class="h-9 w-24" />

    <UButton
      v-else-if="!authSession.data"
      variant="outline"
      icon="i-lucide-log-in"
      :label="$t('sidebar.signIn')"
      @click="showLogin"
    />

    <UButton
      v-else
      variant="solid"
      icon="i-lucide-log-out"
      :label="$t('settings.signOut')"
      @click="signOut()"
    />
  </div>
</template>
