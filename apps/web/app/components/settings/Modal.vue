<script setup lang="ts">
import { toast } from "vue-sonner";
import { BAvatar, BButton, BDivider, BModal } from "@chestnut-chat/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@chestnut-chat/ui/components/ui/dialog";
import { cn } from "@chestnut-chat/ui/lib/utils";

const open = defineModel<boolean>("open", { default: false });
const page = defineModel<SettingsPage>("page", { default: "account" });

const { $authClient } = useNuxtApp();
const authSession = useAuthSession();
const { t } = useI18n();
const signOut = useSignOut();

const pages = computed(() => [
  { value: "account" as const, label: t("settings.account"), icon: "i-ri-user-3-line" },
  {
    value: "customization" as const,
    label: t("settings.customization"),
    icon: "i-ri-palette-line",
  },
  { value: "providers" as const, label: t("settings.providers"), icon: "i-ri-key-2-line" },
  { value: "about" as const, label: t("settings.about"), icon: "i-ri-information-line" },
]);

const currentLabel = computed(() => pages.value.find((item) => item.value === page.value)?.label);

const deleteConfirmOpen = shallowRef(false);
const isDeletingAccount = shallowRef(false);

async function deleteAccount() {
  if (isDeletingAccount.value) return;

  isDeletingAccount.value = true;

  try {
    const result = await $authClient.deleteUser({
      callbackURL: import.meta.client ? window.location.origin : "/",
    });

    if (result.error) {
      toast.error(t("toast.deleteAccountFailed"), {
        description: result.error.message,
      });
      return;
    }

    if (result.data?.message === "Verification email sent") {
      deleteConfirmOpen.value = false;
      toast.success(t("toast.deleteAccountVerificationSent"));
      return;
    }

    deleteConfirmOpen.value = false;
    open.value = false;
    authSession.clear();
    toast.success(t("toast.accountDeleted"));
    await navigateTo("/", { replace: true, external: true });
  } catch (cause) {
    toast.error(t("toast.deleteAccountFailed"), {
      description: cause instanceof Error ? cause.message : undefined,
    });
  } finally {
    isDeletingAccount.value = false;
  }
}

async function handleSignOut() {
  open.value = false;
  await signOut();
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="false"
      class="h-[min(44rem,calc(100svh-2rem))] gap-0 overflow-hidden p-0 sm:max-w-4xl"
    >
      <DialogTitle class="sr-only">{{ $t("settings.title") }}</DialogTitle>
      <DialogDescription class="sr-only">{{ $t("settings.title") }}</DialogDescription>

      <div class="flex h-full min-h-0 flex-col md:flex-row">
        <aside
          class="flex shrink-0 flex-col gap-4 border-b border-separator-border bg-background-secondary-default p-3 md:w-60 md:border-r md:border-b-0 md:p-4"
        >
          <div class="hidden items-center gap-3 px-2 md:flex">
            <BAvatar
              :src="authSession.data?.user?.image ?? undefined"
              :alt="authSession.data?.user?.name"
              :initials="authSession.data?.user?.name?.charAt(0)"
              size="md"
            />
            <div class="min-w-0">
              <p class="truncate text-body-semibold text-text-primary">
                {{ authSession.data?.user?.name }}
              </p>
              <p class="truncate text-caption-1-regular text-text-tertiary">
                {{ authSession.data?.user?.email }}
              </p>
            </div>
          </div>

          <nav
            class="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
            :aria-label="$t('settings.title')"
          >
            <button
              v-for="item in pages"
              :key="item.value"
              type="button"
              :aria-current="page === item.value ? 'page' : undefined"
              :class="
                cn(
                  'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-body-medium text-text-secondary transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                  page === item.value
                    ? 'bg-background-primary-default text-text-primary shadow-card'
                    : 'hover:bg-background-secondary-hover',
                )
              "
              @click="page = item.value"
            >
              <BIcon :name="item.icon" class="size-4 shrink-0 text-foreground-icon-secondary" />
              {{ item.label }}
            </button>
          </nav>

          <div class="mt-auto hidden md:block">
            <BButton variant="ghost" class="w-full justify-start" @click="handleSignOut">
              <BIcon name="i-ri-logout-box-r-line" class="size-4" />
              {{ $t("settings.signOut") }}
            </BButton>
          </div>
        </aside>

        <section class="flex min-h-0 min-w-0 flex-1 flex-col">
          <header
            class="flex items-center justify-between border-b border-separator-border px-6 py-4"
          >
            <h2 class="text-title-3-semibold text-text-primary">{{ currentLabel }}</h2>
            <DialogClose
              class="flex size-8 items-center justify-center rounded-full text-foreground-icon-secondary transition-colors duration-150 outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              :aria-label="$t('actions.cancel')"
            >
              <BIcon name="i-ri-close-line" class="size-5" />
            </DialogClose>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <div v-if="page === 'account'" class="mt-6 space-y-8">
              <section>
                <h3 class="mb-4 text-title-3-semibold">{{ $t("settings.securityOptions") }}</h3>
                <div
                  class="rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card"
                >
                  <h4 class="text-body-medium">{{ $t("settings.dangerZone") }}</h4>
                  <p class="mt-1 text-body-2-regular text-text-secondary">
                    {{ $t("settings.deleteAccountDescription") }}
                  </p>
                  <BButton
                    class="mt-3"
                    variant="danger"
                    :disabled="isDeletingAccount"
                    @click="deleteConfirmOpen = true"
                  >
                    {{ $t("settings.deleteAccount") }}
                  </BButton>
                </div>
              </section>
              <BButton variant="secondary" class="md:hidden" @click="handleSignOut">
                {{ $t("settings.signOut") }}
              </BButton>
            </div>

            <SettingsCustomizationPanel v-else-if="page === 'customization'" />

            <SettingsProvidersPanel v-else-if="page === 'providers'" />

            <div v-else class="mt-6">
              <div
                class="space-y-2 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card"
              >
                <div class="flex items-center justify-between">
                  <span class="text-body-2-regular text-text-secondary">{{
                    $t("settings.appName")
                  }}</span>
                  <span class="text-body-2-medium">{{ $t("app.name") }}</span>
                </div>
                <BDivider />
                <div class="flex items-center justify-between">
                  <span class="text-body-2-regular text-text-secondary">{{
                    $t("settings.version")
                  }}</span>
                  <span class="text-body-2-medium">v0.1.0</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DialogContent>
  </Dialog>

  <BModal
    v-model:open="deleteConfirmOpen"
    :title="$t('settings.deleteAccount')"
    :description="$t('settings.deleteAccountDescription')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="isDeletingAccount" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton variant="danger" :disabled="isDeletingAccount" @click="deleteAccount">
        {{ $t("settings.deleteAccount") }}
      </BButton>
    </template>
  </BModal>
</template>
