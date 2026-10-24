<script setup lang="ts">
import type { AuthProviderOptions } from "@chestnut-chat/auth";
import { toast } from "vue-sonner";
import { BButton, BCloseButton, BDivider, BInput } from "@chestnut-chat/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@chestnut-chat/ui/components/ui/dialog";
import { FieldGroup } from "@chestnut-chat/ui/components/ui/field";

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
const hasSocialProviders = computed(() =>
  Object.values(authOptions.value.socialProviders).some(Boolean),
);

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

onMounted(loadAuthOptions);

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
  <ClientOnly>
    <Dialog v-model:open="open">
      <DialogContent
        :show-close-button="false"
        class="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto rounded-2xl p-6 sm:max-w-[420px] sm:p-8"
      >
        <DialogClose as-child>
          <BCloseButton class="absolute top-3 right-3" size="sm" :aria-label="$t('login.close')" />
        </DialogClose>
        <DialogHeader class="items-center gap-2 pt-2 text-center sm:text-center">
          <span
            class="mb-2 flex size-12 items-center justify-center rounded-2xl bg-background-secondary-default"
          >
            <NuxtImg src="/favicon.svg" alt="" class="size-8" />
          </span>
          <DialogTitle class="text-title-3-semibold text-text-primary">{{
            $t("login.title")
          }}</DialogTitle>
          <DialogDescription>{{ $t("login.subtitle") }}</DialogDescription>
        </DialogHeader>

        <form @submit.prevent="sendOtp">
          <FieldGroup class="gap-3">
            <BButton
              v-if="authOptions.socialProviders.github"
              class="h-11 w-full"
              variant="secondary"
              :disabled="authOptionsPending || loading"
              @click="social('github')"
            >
              <Icon name="ri:github-fill" mode="svg" data-icon="inline-start" aria-hidden="true" />
              {{ $t("login.github") }}
            </BButton>
            <BButton
              v-if="authOptions.socialProviders.google"
              class="h-11 w-full"
              variant="secondary"
              :disabled="authOptionsPending || loading"
              @click="social('google')"
            >
              <Icon name="ri:google-fill" mode="svg" data-icon="inline-start" aria-hidden="true" />
              {{ $t("login.google") }}
            </BButton>

            <BDivider v-if="hasSocialProviders" class="my-2">{{ $t("login.or") }}</BDivider>

            <BInput
              v-model="email"
              type="email"
              autocomplete="email"
              name="email"
              :label="$t('login.email')"
              placeholder="you@example.com"
              :hint="$t('login.emailHint')"
              :disabled="loading"
              class="w-full"
            />
            <BButton
              type="submit"
              class="mt-1 h-11 w-full"
              :variant="email ? 'primary' : 'tertiary'"
              :disabled="!email || loading"
              :aria-busy="loading"
            >
              <Icon
                v-if="loading"
                name="ri:loader-4-line"
                mode="svg"
                class="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {{ $t(loading ? "login.sendingCode" : "login.sendCode") }}
            </BButton>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  </ClientOnly>
</template>
