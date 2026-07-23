<script setup lang="ts">
import type { AuthProviderOptions } from "@chestnut-chat/auth";
import { toast } from "vue-sonner";

const open = defineModel<boolean>("open", { default: false });

const { $authClient } = useNuxtApp();
const config = useRuntimeConfig();
const authSession = useAuthSession();
const { t } = useI18n();

const route = useRoute();
const serverUrl = (import.meta.server && config.serverUrl) || config.public.serverUrl;
const email = ref("");
const otp = ref("");
const otpSent = ref(false);
const loading = ref(false);
const authOptionsPending = ref(false);
const authOptions = ref<AuthProviderOptions>({
  socialProviders: {
    github: false,
    google: false,
  },
  callbackOrigin: "",
  emailOtp: true,
});

async function loadAuthOptions() {
  authOptionsPending.value = true;
  try {
    authOptions.value = await $fetch<AuthProviderOptions>(`${serverUrl}/api/auth-options`, {
      credentials: "include",
    });
  } catch (error) {
    console.error(error);
  } finally {
    authOptionsPending.value = false;
  }
}

onMounted(() => {
  loadAuthOptions();
});

async function social(provider: "github" | "google") {
  if (!authOptions.value.socialProviders[provider]) return;

  const callbackOrigin =
    authOptions.value.callbackOrigin || (import.meta.client ? window.location.origin : "/");

  await $authClient.signIn.social({
    provider,
    callbackURL: new URL(route.fullPath, callbackOrigin).toString(),
  });
}

async function sendOtp() {
  if (!email.value) return;
  loading.value = true;
  try {
    await $authClient.emailOtp.sendVerificationOtp({ email: email.value, type: "sign-in" });
    otpSent.value = true;
    toast.success(t("login.codeSent"), { description: t("login.codeSentDescription") });
  } catch (error: unknown) {
    toast.error(t("login.sendFailed"), {
      description: error instanceof Error ? error.message : undefined,
    });
  } finally {
    loading.value = false;
  }
}

async function verifyOtp() {
  if (!email.value || !otp.value) return;
  loading.value = true;
  try {
    await $authClient.signIn.emailOtp(
      { email: email.value, otp: otp.value },
      {
        onSuccess: async () => {
          await authSession.refresh();
          toast.success(t("login.signedIn"));
          open.value = false;
          await navigateTo("/", { replace: true });
        },
        onError: (error) => {
          toast.error(t("login.signInFailed"), { description: error.error.message });
        },
      },
    );
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="$t('login.title')" :ui="{ content: 'max-w-md' }">
    <template #body>
      <div class="space-y-3">
        <UButton
          block
          color="neutral"
          variant="outline"
          icon="i-simple-icons-github"
          size="md"
          :label="$t('login.github')"
          :loading="authOptionsPending"
          :disabled="!authOptions.socialProviders.github"
          @click="social('github')"
        />
        <UButton
          block
          color="neutral"
          variant="outline"
          icon="i-simple-icons-google"
          size="md"
          :label="$t('login.google')"
          :loading="authOptionsPending"
          :disabled="!authOptions.socialProviders.google"
          @click="social('google')"
        />

        <USeparator :label="$t('login.or')" />

        <UInput v-model="email" type="email" :placeholder="$t('login.email')" class="w-full" />
        <UInput
          v-if="otpSent"
          v-model="otp"
          :placeholder="$t('login.otp')"
          class="w-full"
          @keydown.enter="verifyOtp"
        />
        <UButton
          v-if="!otpSent"
          block
          :label="$t('login.sendCode')"
          :loading="loading"
          @click="sendOtp"
        />
        <UButton v-else block :label="$t('login.verify')" :loading="loading" @click="verifyOtp" />
      </div>
    </template>
  </UModal>
</template>
