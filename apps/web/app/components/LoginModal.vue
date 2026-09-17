<script setup lang="ts">
import type { AuthProviderOptions } from "@chestnut-chat/auth";
import { toast } from "vue-sonner";
import { BButton, BDivider, BInput } from "@chestnut-chat/ui";

const open = defineModel<boolean>("open", { default: false });

const { $authClient } = useNuxtApp();
const config = useRuntimeConfig();
const otpLogin = useOtpLogin();
const { t } = useI18n();

const route = useRoute();
const serverUrl = (import.meta.server && config.serverUrl) || config.public.serverUrl;
const email = ref("");
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
    otpLogin.setEmail(email.value);
    open.value = false;
    await navigateTo("/verify-otp");
  } catch (error: unknown) {
    toast.error(t("login.sendFailed"), {
      description: error instanceof Error ? error.message : undefined,
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="$t('login.title')" :ui="{ content: 'max-w-md' }">
    <template #body>
      <div class="space-y-3">
        <BButton
          class="w-full"
          variant="secondary"
          :disabled="!authOptions.socialProviders.github || authOptionsPending"
          @click="social('github')"
        >
          <UIcon name="i-simple-icons-github" class="size-5 shrink-0" />
          {{ $t("login.github") }}
        </BButton>
        <BButton
          class="w-full"
          variant="secondary"
          :disabled="!authOptions.socialProviders.google || authOptionsPending"
          @click="social('google')"
        >
          <UIcon name="i-simple-icons-google" class="size-5 shrink-0" />
          {{ $t("login.google") }}
        </BButton>

        <BDivider>{{ $t("login.or") }}</BDivider>

        <BInput
          v-model="email"
          type="email"
          :placeholder="$t('login.email')"
          class="w-full"
          @keydown.enter="sendOtp"
        />
        <BButton class="w-full" :disabled="!email || loading" @click="sendOtp">
          {{ $t("login.sendCode") }}
        </BButton>
      </div>
    </template>
  </UModal>
</template>
