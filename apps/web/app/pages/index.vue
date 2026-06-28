<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});

const { create } = useChats();
const authSession = useAuthSession();
const toast = useToast();
const { t } = useI18n();
const { show: showLogin } = useLoginModal();

const pendingPrompt = useState<{
  text: string;
  model: string;
  reasoning: boolean;
  webSearch: boolean;
} | null>("pendingPrompt", () => null);

async function requireAuth() {
  const session = await authSession.ensure();
  if (session?.user) return true;

  showLogin();
  return false;
}

async function onSubmit(payload: {
  text: string;
  model: string;
  reasoning: boolean;
  webSearch: boolean;
}) {
  if (!(await requireAuth())) return;

  try {
    const row = await create.mutateAsync({});
    if (!row) return;
    pendingPrompt.value = payload;
    await navigateTo(`/chat/${row.id}`);
  } catch (error) {
    toast.add({
      title: t("toast.chatCreateFailed"),
      description: error instanceof Error ? error.message : undefined,
      color: "error",
    });
  }
}
</script>

<template>
  <UDashboardPanel id="dashboard-chat">
    <template #body>
      <div class="flex h-full flex-col items-center justify-center px-4">
        <div class="w-full max-w-2xl space-y-6">
          <h1 class="text-center text-2xl font-semibold">{{ $t("chat.emptyTitle") }}</h1>
          <ChatBox :before-submit="requireAuth" @submit="onSubmit" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
