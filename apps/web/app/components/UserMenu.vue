<script setup lang="ts">
const { $authClient } = useNuxtApp();
const authSession = useAuthSession();
const toast = useToast();
const hydrated = ref(false);

onMounted(() => {
  hydrated.value = true;
  authSession.ensure();
});

const handleSignOut = async () => {
  try {
    await $authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          authSession.clear();
          toast.add({ title: "Signed out successfully" });
          await navigateTo("/", { replace: true, external: true });
        },
        onError: (error) => {
          toast.add({
            title: "Sign out failed",
            description: error?.error?.message || "Unknown error",
          });
        },
      },
    });
  } catch (error: any) {
    toast.add({
      title: "An unexpected error occurred during sign out",
      description: error.message || "Please try again.",
    });
  }
};
</script>

<template>
  <div>
    <USkeleton v-if="!hydrated || authSession.isPending" class="h-9 w-24" />

    <UButton v-else-if="!authSession.data" variant="outline" to="/login"> Sign In </UButton>

    <UButton
      v-else
      variant="solid"
      icon="i-lucide-log-out"
      label="Sign out"
      @click="handleSignOut()"
    />
  </div>
</template>
