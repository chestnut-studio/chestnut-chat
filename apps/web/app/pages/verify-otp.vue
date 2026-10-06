<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { BButton, BCard, BLinkButton, BOtpInput } from "@chestnut-chat/ui";

definePageMeta({
  layout: false,
});

const { $authClient } = useNuxtApp();
const otpLogin = useOtpLogin();
const authSession = useAuthSession();
const { t } = useI18n();

const email = otpLogin.email.value;

if (!email) {
  await navigateTo("/", { replace: true });
}

const COOLDOWN_SECONDS = 60;
const digits = ref<number[]>([]);
const verifying = ref(false);
const cooldown = ref(COOLDOWN_SECONDS);
const error = ref<string | null>(null);

let cooldownInterval: ReturnType<typeof setInterval> | null = null;

function startCooldown() {
  cooldown.value = COOLDOWN_SECONDS;
  if (cooldownInterval) clearInterval(cooldownInterval);
  cooldownInterval = setInterval(() => {
    if (cooldown.value > 0) {
      cooldown.value--;
    } else {
      if (cooldownInterval) clearInterval(cooldownInterval);
      cooldownInterval = null;
    }
  }, 1000);
}

onMounted(() => {
  startCooldown();
});

onUnmounted(() => {
  if (cooldownInterval) clearInterval(cooldownInterval);
});

function getOtp(): string {
  return digits.value.join("");
}

function getErrorMessage(code: string): string {
  switch (code) {
    case "INVALID_OTP":
      return t("verifyOtp.invalidCode");
    case "TOO_MANY_ATTEMPTS":
      return t("verifyOtp.tooManyAttempts");
    case "OTP_EXPIRED":
      return t("verifyOtp.expired");
    default:
      return t("verifyOtp.genericError");
  }
}

function getErrorDescription(code: string): string | undefined {
  switch (code) {
    case "INVALID_OTP":
      return t("verifyOtp.invalidCodeDescription");
    case "TOO_MANY_ATTEMPTS":
      return t("verifyOtp.tooManyAttemptsDescription");
    case "OTP_EXPIRED":
      return t("verifyOtp.expiredDescription");
    default:
      return undefined;
  }
}

async function verify() {
  if (verifying.value) return;
  const otp = getOtp();
  if (otp.length !== 6) return;

  verifying.value = true;
  error.value = null;

  try {
    await $authClient.signIn.emailOtp(
      { email: email!, otp },
      {
        onSuccess: async () => {
          otpLogin.clear();
          await authSession.refresh();
          toast.success(t("login.signedIn"));
          await navigateTo("/", { replace: true });
        },
        onError: (err) => {
          const code = err.error?.code ?? "";
          error.value = getErrorMessage(code);
          const description = getErrorDescription(code);
          if (code === "OTP_EXPIRED" || code === "TOO_MANY_ATTEMPTS") {
            digits.value = [];
            error.value = null;
          }
          if (description) {
            toast.error(getErrorMessage(code), { description });
          }
        },
      },
    );
  } finally {
    verifying.value = false;
  }
}

function onComplete(value: number[]) {
  if (value.length === 6) {
    verify();
  }
}

async function resend() {
  if (cooldown.value > 0 || !email) return;

  try {
    await $authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    digits.value = [];
    error.value = null;
    startCooldown();
    toast.success(t("verifyOtp.resentSuccess"));
  } catch (err: unknown) {
    toast.error(t("login.sendFailed"), {
      description: err instanceof Error ? err.message : undefined,
    });
  }
}

function goBack() {
  otpLogin.clear();
  navigateTo("/", { replace: true });
}
</script>

<template>
  <div class="flex h-svh items-center justify-center bg-elevated p-4">
    <BCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <div
            class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10"
          >
            <BIcon name="i-lucide-mail" class="size-6 text-primary" />
          </div>
          <h1 class="text-xl font-semibold text-default">{{ $t("verifyOtp.title") }}</h1>
          <p class="mt-1.5 text-sm text-muted">
            {{ $t("verifyOtp.description") }}
            <span class="font-medium text-default">{{ email }}</span>
          </p>
        </div>
      </template>

      <div class="space-y-6">
        <div class="flex justify-center">
          <BOtpInput
            v-model="digits"
            type="number"
            :length="6"
            otp
            autofocus
            highlight
            size="lg"
            @complete="onComplete"
          />
        </div>

        <p v-if="error" class="text-center text-sm font-medium text-error">
          {{ error }}
        </p>

        <BButton class="w-full" :disabled="getOtp().length !== 6 || verifying" @click="verify">
          {{ t("login.verify") }}
        </BButton>

        <div class="text-center">
          <BLinkButton v-if="cooldown > 0" variant="secondary" size="xs" disabled>
            {{ t("verifyOtp.resendIn", { seconds: cooldown }) }}
          </BLinkButton>
          <BLinkButton v-else variant="secondary" size="xs" @click="resend">
            {{ t("verifyOtp.resend") }}
          </BLinkButton>
        </div>
      </div>

      <template #footer>
        <BButton variant="ghost" size="small" :leading-icon="ArrowLeft" @click="goBack">
          {{ $t("verifyOtp.back") }}
        </BButton>
      </template>
    </BCard>
  </div>
</template>
