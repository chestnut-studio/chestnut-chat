<script setup lang="ts">
import type { AuthProviderOptions } from "@chestnut-chat/auth";
import { toast } from "vue-sonner";
import { BButton, BCloseButton, BDivider, BInput } from "@chestnut-chat/ui";
import {
  Dialog,
  DialogContent,
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
        :aria-describedby="undefined"
        class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
      >
        <DialogHeader class="flex-row items-center justify-between">
          <DialogTitle>{{ $t("login.title") }}</DialogTitle>
          <DialogClose as-child
            ><BCloseButton size="sm" :aria-label="$t('login.close')"
          /></DialogClose>
        </DialogHeader>

        <form @submit.prevent="sendOtp">
          <FieldGroup class="gap-3">
            <BButton
              class="w-full"
              variant="secondary"
              :disabled="!authOptions.socialProviders.github || authOptionsPending"
              @click="social('github')"
            >
              <Icon
                name="simple-icons:github"
                mode="svg"
                class="mr-2 size-5 shrink-0"
                aria-hidden="true"
              />
              {{ $t("login.github") }}
            </BButton>
            <BButton
              class="w-full"
              variant="secondary"
              :disabled="!authOptions.socialProviders.google || authOptionsPending"
              @click="social('google')"
            >
              <Icon
                name="simple-icons:google"
                mode="svg"
                class="mr-2 size-5 shrink-0"
                aria-hidden="true"
              />
              {{ $t("login.google") }}
            </BButton>

            <BDivider>{{ $t("login.or") }}</BDivider>

            <BInput
              v-model="email"
              type="email"
              autocomplete="email"
              :aria-label="$t('login.email')"
              :placeholder="$t('login.email')"
              class="w-full"
            />
            <BButton type="submit" class="w-full" :disabled="!email || loading">
              {{ $t("login.sendCode") }}
            </BButton>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  </ClientOnly>
</template>
