<script setup lang="ts">
import type { AuthProviderOptions } from "@chestnut-chat/auth";
import { toast } from "vue-sonner";
import { BButton, BCloseButton, BDivider, BInput } from "@chestnut-chat/ui";

const open = defineModel<boolean>("open", { default: false });
const dialog = useTemplateRef<HTMLDialogElement>("dialog");
const titleId = useId();

const { $authClient } = useNuxtApp();
const config = useRuntimeConfig();
const otpLogin = useOtpLogin();
const { t } = useI18n();

const route = useRoute();
const serverUrl = (import.meta.server && config.serverUrl) || config.public.serverUrl;
const email = ref("");
const loading = ref(false);
const dialogVisible = ref(false);
const authOptionsPending = ref(false);
const authOptions = ref<AuthProviderOptions>({
  socialProviders: {
    github: false,
    google: false,
  },
  callbackOrigin: "",
  emailOtp: true,
});

let closeTimer: ReturnType<typeof setTimeout> | undefined;
let showFrame: number | undefined;

function clearDialogTimers() {
  if (closeTimer) clearTimeout(closeTimer);
  if (showFrame) cancelAnimationFrame(showFrame);
  closeTimer = undefined;
  showFrame = undefined;
}

async function showDialog() {
  clearDialogTimers();
  dialogVisible.value = false;
  await nextTick();

  if (!dialog.value?.open) dialog.value?.showModal();
  showFrame = requestAnimationFrame(() => {
    dialogVisible.value = true;
  });
}

function hideDialog() {
  clearDialogTimers();
  dialogVisible.value = false;
  closeTimer = setTimeout(() => {
    dialog.value?.close();
  }, 300);
}

function requestClose() {
  open.value = false;
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) requestClose();
}

function onDialogClose() {
  clearDialogTimers();
  dialogVisible.value = false;
  open.value = false;
}

watch(
  open,
  (isOpen) => {
    if (isOpen) showDialog();
    else if (dialog.value?.open) hideDialog();
  },
  { flush: "post" },
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

onMounted(() => {
  loadAuthOptions();
  if (open.value) showDialog();
});

onBeforeUnmount(() => {
  clearDialogTimers();
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
  <ClientOnly>
    <Teleport to="body">
      <dialog
        ref="dialog"
        class="login-dialog fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none items-center justify-center overflow-y-auto bg-transparent p-4 open:flex"
        :class="{ 'login-dialog--closing': !open }"
        :aria-labelledby="titleId"
        @cancel.prevent="requestClose"
        @close="onDialogClose"
        @click="onBackdropClick"
      >
        <section
          class="w-full max-w-md transform-gpu overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-xl transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[opacity,transform,filter] motion-reduce:transition-none"
          :class="
            dialogVisible ? 'scale-100 opacity-100 blur-0' : 'scale-[0.85] opacity-0 blur-[4px]'
          "
          role="document"
        >
          <header
            class="flex items-center justify-between gap-4 border-b border-separator-border px-6 py-5"
          >
            <h2 :id="titleId" class="text-title-2-medium text-text-primary">
              {{ $t("login.title") }}
            </h2>
            <BCloseButton size="sm" :aria-label="$t('login.close')" @click="requestClose" />
          </header>

          <form class="flex flex-col gap-3 p-6" @submit.prevent="sendOtp">
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
              :placeholder="$t('login.email')"
              class="w-full"
            />
            <BButton type="submit" class="w-full" :disabled="!email || loading">
              {{ $t("login.sendCode") }}
            </BButton>
          </form>
        </section>
      </dialog>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.login-dialog::backdrop {
  background: rgb(0 0 0 / 70%);
  animation: login-backdrop-in 300ms ease-out;
}

.login-dialog--closing::backdrop {
  animation: login-backdrop-out 300ms ease-in forwards;
}

@keyframes login-backdrop-in {
  from {
    opacity: 0;
  }
}

@keyframes login-backdrop-out {
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-dialog::backdrop,
  .login-dialog--closing::backdrop {
    animation: none;
  }
}
</style>
