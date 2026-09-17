<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";
import { toast } from "vue-sonner";
import {
  BAvatar,
  BButton,
  BButtonLink,
  BDivider,
  BTab,
  BTabList,
  BTabPanel,
  BTabs,
} from "@chestnut-chat/ui";

definePageMeta({
  layout: false,
  middleware: ["auth"],
});

const { $authClient } = useNuxtApp();
const authSession = useAuthSession();
const { t } = useI18n();

useHead(() => ({
  title: t("settings.title"),
  titleTemplate: "%s - Chestnut Chat",
}));

const tabs = computed(() => [
  { label: t("settings.account"), slot: "account" as const },
  { label: t("settings.customization"), slot: "customization" as const },
  { label: t("settings.providers"), slot: "providers" as const },
  { label: t("settings.about"), slot: "about" as const },
]);

const activeTab = ref("account");

const deleteConfirmOpen = shallowRef(false);
const isDeletingAccount = shallowRef(false);
const signOut = useSignOut();

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
</script>

<template>
  <div class="bg-muted/30 min-h-screen">
    <div class="border-default border-b bg-background">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <NuxtLink v-slot="{ href, navigate }" custom to="/">
          <BButtonLink :href="href ?? undefined" variant="ghost" @click="navigate">
            <ArrowLeft :size="18" class="shrink-0" />
            {{ $t("settings.backToChat") }}
          </BButtonLink>
        </NuxtLink>
        <div class="flex items-center gap-2">
          <UColorModeButton />
          <BButton variant="ghost" @click="signOut">
            {{ $t("settings.signOut") }}
          </BButton>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div class="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside class="shrink-0 lg:w-56">
          <div class="flex items-center gap-3 lg:flex-col lg:text-center">
            <BAvatar
              :src="authSession.data?.user?.image ?? undefined"
              :alt="authSession.data?.user?.name"
              :initials="authSession.data?.user?.name?.charAt(0)"
              size="lg"
            />
            <div>
              <p class="text-lg font-semibold">{{ authSession.data?.user?.name }}</p>
              <p class="text-muted text-sm">{{ authSession.data?.user?.email }}</p>
            </div>
          </div>
        </aside>

        <main class="min-w-0 flex-1">
          <BTabs v-model="activeTab" class="w-full">
            <BTabList>
              <BTab v-for="tab in tabs" :key="tab.slot" :value="tab.slot">
                {{ tab.label }}
              </BTab>
            </BTabList>

            <BTabPanel value="account">
              <div class="mt-6 space-y-8">
                <section>
                  <h2 class="mb-4 text-xl font-semibold">{{ $t("settings.securityOptions") }}</h2>
                  <div class="border-default rounded-lg border p-4">
                    <h3 class="font-medium">{{ $t("settings.dangerZone") }}</h3>
                    <p class="text-muted mt-1 text-sm">
                      {{ $t("settings.deleteAccountDescription") }}
                    </p>
                    <BButton
                      class="mt-3"
                      variant="danger"
                      :disabled="isDeletingAccount"
                      @click="
                        () => {
                          deleteConfirmOpen = true;
                        }
                      "
                    >
                      {{ $t("settings.deleteAccount") }}
                    </BButton>
                  </div>
                </section>
              </div>
            </BTabPanel>

            <BTabPanel value="customization">
              <SettingsCustomizationPanel />
            </BTabPanel>

            <BTabPanel value="providers">
              <SettingsProvidersPanel />
            </BTabPanel>

            <BTabPanel value="about">
              <div class="mt-6 space-y-4">
                <div class="border-default space-y-2 rounded-lg border p-4">
                  <div class="flex items-center justify-between">
                    <span class="text-muted text-sm">{{ $t("settings.appName") }}</span>
                    <span class="text-sm font-medium">{{ $t("app.name") }}</span>
                  </div>
                  <BDivider />
                  <div class="flex items-center justify-between">
                    <span class="text-muted text-sm">{{ $t("settings.version") }}</span>
                    <span class="text-sm font-medium">v0.1.0</span>
                  </div>
                </div>
              </div>
            </BTabPanel>
          </BTabs>
        </main>
      </div>
    </div>

    <UModal
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
    </UModal>
  </div>
</template>
