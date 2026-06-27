<script setup lang="ts">
import SignInForm from "~/components/SignInForm.vue";
import SignUpForm from "~/components/SignUpForm.vue";

const authSession = useAuthSession();
const showSignIn = ref(true);

onMounted(() => {
  authSession.ensure();
});

watchEffect(() => {
  if (!authSession.isPending && authSession.data) {
    navigateTo("/", { replace: true });
  }
});
</script>

<template>
  <UContainer class="py-8">
    <div
      v-if="!authSession.initialized || authSession.isPending"
      class="flex flex-col items-center justify-center gap-4 py-12"
    >
      <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl text-primary" />
      <span class="text-muted">Loading...</span>
    </div>
    <div v-else-if="!authSession.data">
      <SignInForm v-if="showSignIn" @switch-to-sign-up="showSignIn = false" />
      <SignUpForm v-else @switch-to-sign-in="showSignIn = true" />
    </div>
  </UContainer>
</template>
