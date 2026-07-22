<script setup lang="ts">
import type { DocumentAttachment } from "@chestnut-chat/api/chat/attachments";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import type { FileUIPart } from "ai";
import { toast } from "vue-sonner";

definePageMeta({
  layout: "dashboard",
});

const { create } = useChats();
const authSession = useAuthSession();
const { t } = useI18n();
const { show: showLogin } = useLoginModal();
const pendingChatPrompt = usePendingChatPrompt();

useHead(() => ({
  title: t("app.name"),
}));

const isStarting = ref(false);

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
  reasoningEffort: ReasoningEffort;
  webSearch: boolean;
  files: FileUIPart[];
  documents: DocumentAttachment[];
}) {
  if (!(await requireAuth())) return;
  if (isStarting.value) return;

  isStarting.value = true;
  try {
    const row = await create.mutateAsync({});
    if (!row) return;
    pendingChatPrompt.set(row.id, payload);
    await navigateTo(`/chat/${row.id}`);
  } catch (error) {
    toast.error(t("toast.chatCreateFailed"), {
      description: error instanceof Error ? error.message : undefined,
    });
  } finally {
    isStarting.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="dashboard-chat">
    <template #body>
      <div class="flex h-full flex-col items-center justify-center px-4">
        <div class="w-full max-w-2xl space-y-6">
          <h1 class="text-center text-2xl font-semibold">{{ $t("chat.emptyTitle") }}</h1>
          <ChatBox :before-submit="requireAuth" @submit="onSubmit">
            <template #below="{ submitSuggestion }">
              <ChatSuggestions :disabled="isStarting" @select="submitSuggestion" />
            </template>
          </ChatBox>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
