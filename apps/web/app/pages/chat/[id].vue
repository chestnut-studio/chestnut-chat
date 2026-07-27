<script setup lang="ts">
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import { useChat } from "@ai-sdk/vue";
import { useQuery } from "@tanstack/vue-query";
import { DefaultChatTransport, type ChatStatus } from "ai";
import { toast } from "vue-sonner";

import type { DocumentAttachment } from "@chestnut-chat/api/chat/attachments";
import type { FileUIPart } from "ai";

import {
  DEFAULT_MODEL,
  builtinChatModelValue,
  decodeChatModelValue,
  isLegacyDeepSeekModel,
} from "~/utils/models";
import type { ChatUIMessage } from "~/types/chat";

const route = useRoute();
const { $orpc } = useNuxtApp();
const config = useRuntimeConfig();
const { t } = useI18n();
const { list: chats, invalidate: invalidateChats, applyTitle } = useChats();
const chatId = computed(() => route.params.id as string);
const pendingChatPrompt = usePendingChatPrompt();
const chatTitle = computed(
  () => chats.data.value?.find((chat) => chat.id === chatId.value)?.title ?? t("sidebar.newChat"),
);
const serverUrl = config.public.serverUrl;

useHead(() => ({
  title: chatTitle.value,
  titleTemplate: "%s - Chestnut Chat",
}));

definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});

const history = useQuery(
  computed(() => $orpc.chat.messages.queryOptions({ input: { chatId: chatId.value } })),
);

const initialPrompt = pendingChatPrompt.peek(chatId.value);
const initialPromptOptions = initialPrompt
  ? {
      model: initialPrompt.model,
      reasoning: initialPrompt.reasoning,
      reasoningEffort: initialPrompt.reasoningEffort,
      webSearch: initialPrompt.webSearch,
    }
  : null;

const MAX_TOAST_ERROR_LENGTH = 160;

function errorMessage(error: Error) {
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    // The transport uses plain text for some network errors.
  }

  return error.message;
}

function errorDescription(error: Error) {
  const message = errorMessage(error);
  if (/has not activated the model/i.test(message)) {
    return t("toast.modelNotActivated");
  }

  const withoutRequestId = message.replace(/\s*Request id:\s*\S+\.?$/i, "").trim();
  if (withoutRequestId.length <= MAX_TOAST_ERROR_LENGTH) return withoutRequestId;

  return `${withoutRequestId.slice(0, MAX_TOAST_ERROR_LENGTH).trimEnd()}…`;
}

const { messages, status, sendMessage, regenerate, stop, clearError } = useChat<ChatUIMessage>(
  () => ({
    id: chatId.value,
    messages: [],
    transport: new DefaultChatTransport({
      api: `${serverUrl}/ai/chat`,
      credentials: "include",
    }),
    onError(error) {
      console.error(error);
      toast.error(t("toast.chatFailed"), {
        description: errorDescription(error),
      });
    },
    onData(dataPart) {
      if (dataPart.type === "data-chat-title") {
        applyTitle(chatId.value, dataPart.data.title);
      }
    },
    onFinish({ isAbort, isError }) {
      if (!isAbort && !isError) {
        void invalidateChats();
      }
    },
  }),
);
const renderedMessages = computed(() => [...messages.value]);
const isHistoryLoading = computed(
  () => history.isPending.value && renderedMessages.value.length === 0,
);

const lastOptions = ref(
  initialPromptOptions ?? {
    model: DEFAULT_MODEL,
    reasoning: false,
    reasoningEffort: "high" as ReasoningEffort,
    webSearch: false,
  },
);
const hasRestoredModel = ref(false);
const selectedModel = computed({
  get: () => lastOptions.value.model,
  set: (model: string) => {
    lastOptions.value = { ...lastOptions.value, model };
  },
});
const selectedReasoning = computed({
  get: () => lastOptions.value.reasoning,
  set: (reasoning: boolean) => {
    lastOptions.value = { ...lastOptions.value, reasoning };
  },
});
const selectedReasoningEffort = computed({
  get: () => lastOptions.value.reasoningEffort,
  set: (reasoningEffort: ReasoningEffort) => {
    lastOptions.value = { ...lastOptions.value, reasoningEffort };
  },
});
const selectedWebSearch = computed({
  get: () => lastOptions.value.webSearch,
  set: (webSearch: boolean) => {
    lastOptions.value = { ...lastOptions.value, webSearch };
  },
});
const editOpen = ref(false);
const editTarget = ref<string | null>(null);
const editText = ref("");
const isRenderingResponse = ref(false);
const abortRenderKey = ref(0);
const isRequestActive = computed(
  () => status.value === "submitted" || status.value === "streaming",
);
const promptStatus = computed<ChatStatus>(() =>
  isRequestActive.value || isRenderingResponse.value ? "streaming" : status.value,
);

function restoreModelValue(value: string | null) {
  if (!value) return null;
  if (decodeChatModelValue(value)) return value;
  if (isLegacyDeepSeekModel(value)) return builtinChatModelValue("deepseek", value);

  return value;
}

function restoreLastModel(rows: NonNullable<typeof history.data.value>) {
  const model = [...rows].reverse().find((row) => row.model)?.model ?? null;
  const restoredModel = restoreModelValue(model);
  if (!restoredModel) return;

  lastOptions.value = { ...lastOptions.value, model: restoredModel };
}

watch(
  () => history.data.value,
  (rows) => {
    if (!rows || !rows.every((row) => row.chatId === chatId.value)) return;

    if (!hasRestoredModel.value) {
      restoreLastModel(rows);
      hasRestoredModel.value = true;
    }

    if (messages.value.length === 0) {
      messages.value = rows.map((row) => ({
        id: row.id,
        role: row.role as ChatUIMessage["role"],
        parts: row.parts as ChatUIMessage["parts"],
      }));
    }
  },
  { immediate: true },
);

watch(chatId, () => {
  messages.value = [];
  hasRestoredModel.value = false;
  isRenderingResponse.value = false;
  abortRenderKey.value += 1;
  clearError();
});

onMounted(() => {
  const payload = pendingChatPrompt.consume(chatId.value);
  if (payload) {
    send(payload);
  }
});

function requestBody() {
  return { chatId: chatId.value, ...lastOptions.value };
}

function send(payload: {
  text: string;
  model: string;
  reasoning: boolean;
  reasoningEffort: ReasoningEffort;
  webSearch: boolean;
  files?: FileUIPart[];
  documents?: DocumentAttachment[];
}) {
  lastOptions.value = {
    model: payload.model,
    reasoning: payload.reasoning,
    reasoningEffort: payload.reasoningEffort,
    webSearch: payload.webSearch,
  };

  const files = payload.files ?? [];
  const documents = payload.documents ?? [];

  if (documents.length === 0) {
    void sendMessage(files.length > 0 ? { text: payload.text, files } : { text: payload.text }, {
      body: requestBody(),
    });
    return;
  }

  void sendMessage(
    {
      role: "user",
      parts: [
        { type: "text", text: payload.text },
        ...documents.map((document) => ({
          type: "data-document" as const,
          data: document,
        })),
        ...files,
      ],
    },
    { body: requestBody() },
  );
}

function onRegenerate(messageId: string) {
  void regenerate({ messageId, body: requestBody() });
}

function abortResponse() {
  abortRenderKey.value += 1;
  stop();
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
        class="group relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6"
      >
        <ChatHistoryLoading v-if="isHistoryLoading" />
        <ChatMessages
          v-else
          :key="chatId"
          :abort-key="abortRenderKey"
          :messages="renderedMessages"
          :status="status"
          @rendering-change="isRenderingResponse = $event"
          @regenerate="onRegenerate"
          @edit="openEdit"
        />
      </div>
    </template>

    <template #footer>
      <UContainer class="w-full pb-4 sm:pb-6">
        <ChatBox
          v-model="selectedModel"
          v-model:reasoning="selectedReasoning"
          v-model:reasoning-effort="selectedReasoningEffort"
          v-model:web-search="selectedWebSearch"
          :status="promptStatus"
          @submit="send"
          @stop="abortResponse"
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
