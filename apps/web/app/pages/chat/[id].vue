<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import { useQuery } from "@tanstack/vue-query";
import { DefaultChatTransport, type UIMessage } from "ai";

import { DEFAULT_MODEL } from "~/utils/models";

const route = useRoute();
const { $orpc } = useNuxtApp();
const config = useRuntimeConfig();
const toast = useToast();
const { t } = useI18n();
const { invalidate: invalidateChats } = useChats();
const chatId = computed(() => route.params.id as string);
const serverUrl = config.public.serverUrl;

definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});

const history = useQuery(
  computed(() => $orpc.chat.messages.queryOptions({ input: { chatId: chatId.value } })),
);

const pendingPrompt = useState<{
  text: string;
  model: string;
  reasoning: boolean;
  webSearch: boolean;
} | null>("pendingPrompt", () => null);

function errorDescription(error: Error) {
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    // The transport uses plain text for some network errors.
  }

  return error.message;
}

const { messages, status, sendMessage, regenerate, stop, clearError } = useChat<UIMessage>(() => ({
  id: chatId.value,
  messages: [],
  transport: new DefaultChatTransport({
    api: `${serverUrl}/ai/chat`,
    credentials: "include",
  }),
  onError(error) {
    console.error(error);
    toast.add({
      title: t("toast.chatFailed"),
      description: errorDescription(error),
      color: "error",
    });
  },
  onFinish({ isAbort, isError }) {
    if (!isAbort && !isError) {
      void invalidateChats();
    }
  },
}));

const lastOptions = ref({
  model: DEFAULT_MODEL,
  reasoning: false,
  webSearch: false,
});
const editOpen = ref(false);
const editTarget = ref<string | null>(null);
const editText = ref("");

watch(
  () => history.data.value,
  (rows) => {
    if (rows && rows.every((row) => row.chatId === chatId.value) && messages.value.length === 0) {
      messages.value = rows.map((row) => ({
        id: row.id,
        role: row.role as UIMessage["role"],
        parts: row.parts as UIMessage["parts"],
      }));
    }
  },
  { immediate: true },
);

watch(chatId, () => {
  messages.value = [];
  clearError();
});

onMounted(() => {
  if (pendingPrompt.value) {
    const payload = pendingPrompt.value;
    pendingPrompt.value = null;
    send(payload);
  }
});

function requestBody() {
  return { chatId: chatId.value, ...lastOptions.value };
}

function send(payload: { text: string; model: string; reasoning: boolean; webSearch: boolean }) {
  lastOptions.value = {
    model: payload.model,
    reasoning: payload.reasoning,
    webSearch: payload.webSearch,
  };
  void sendMessage({ text: payload.text }, { body: requestBody() });
}

function onRegenerate(messageId: string) {
  void regenerate({ messageId, body: requestBody() });
}

function openEdit(payload: { id: string; text: string }) {
  editTarget.value = payload.id;
  editText.value = payload.text;
  editOpen.value = true;
}

function confirmEdit() {
  if (!editTarget.value || !editText.value.trim()) return;

  const index = messages.value.findIndex((message) => message.id === editTarget.value);
  if (index === -1) return;

  messages.value = messages.value.slice(0, index);
  void sendMessage({ text: editText.value.trim() }, { body: requestBody() });
  editOpen.value = false;
}
</script>

<template>
  <UDashboardPanel
    :id="`chat-${chatId}`"
    :ui="{ body: 'min-h-0 gap-0 overflow-hidden p-0 sm:gap-0 sm:p-0' }"
  >
    <template #body>
      <div
        class="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6"
      >
        <ChatMessages
          :messages="messages"
          :status="status"
          @regenerate="onRegenerate"
          @edit="openEdit"
        />
      </div>
    </template>

    <template #footer>
      <UContainer class="w-full pb-4 sm:pb-6">
        <ChatBox
          :status="status"
          @submit="send"
          @stop="stop()"
          @reload="regenerate({ body: requestBody() })"
        />
      </UContainer>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="editOpen" :title="$t('chat.editMessage')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UTextarea v-model="editText" autoresize :maxrows="8" class="w-full" />
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" :label="$t('actions.cancel')" @click="close" />
      <UButton :label="$t('actions.save')" @click="confirmEdit" />
    </template>
  </UModal>
</template>
