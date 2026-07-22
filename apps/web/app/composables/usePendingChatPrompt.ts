import type { DocumentAttachment } from "@chestnut-chat/api/chat/attachments";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import type { FileUIPart } from "ai";

import { attachmentPayloadFitsSessionStorage } from "~/utils/attachments";

export type PendingChatPrompt = {
  text: string;
  model: string;
  reasoning: boolean;
  reasoningEffort: ReasoningEffort;
  webSearch: boolean;
  files: FileUIPart[];
  documents: DocumentAttachment[];
};

type StoredPendingChatPrompt = PendingChatPrompt & {
  chatId: string;
};

const STORAGE_PREFIX = "pending-chat-prompt:";

function isFileUIPart(value: unknown): value is FileUIPart {
  if (!value || typeof value !== "object") return false;
  const part = value as Record<string, unknown>;
  return (
    part.type === "file" &&
    typeof part.mediaType === "string" &&
    typeof part.url === "string" &&
    (part.filename === undefined || typeof part.filename === "string")
  );
}

function isDocumentAttachment(value: unknown): value is DocumentAttachment {
  if (!value || typeof value !== "object") return false;
  const document = value as Record<string, unknown>;
  return (
    typeof document.filename === "string" &&
    typeof document.mediaType === "string" &&
    typeof document.extractedText === "string"
  );
}

function isPendingChatPrompt(value: unknown): value is PendingChatPrompt {
  if (!value || typeof value !== "object") return false;

  const prompt = value as Record<string, unknown>;
  return (
    typeof prompt.text === "string" &&
    typeof prompt.model === "string" &&
    typeof prompt.reasoning === "boolean" &&
    (prompt.reasoningEffort === "low" ||
      prompt.reasoningEffort === "high" ||
      prompt.reasoningEffort === "max") &&
    typeof prompt.webSearch === "boolean" &&
    Array.isArray(prompt.files) &&
    prompt.files.every(isFileUIPart) &&
    Array.isArray(prompt.documents) &&
    prompt.documents.every(isDocumentAttachment)
  );
}

function normalizePrompt(prompt: PendingChatPrompt): PendingChatPrompt {
  return {
    text: prompt.text,
    model: prompt.model,
    reasoning: prompt.reasoning,
    reasoningEffort: prompt.reasoningEffort,
    webSearch: prompt.webSearch,
    files: prompt.files ?? [],
    documents: prompt.documents ?? [],
  };
}

export function usePendingChatPrompt() {
  const state = useState<StoredPendingChatPrompt | null>("pending-chat-prompt", () => null);

  function storageKey(chatId: string) {
    return `${STORAGE_PREFIX}${chatId}`;
  }

  function set(chatId: string, prompt: PendingChatPrompt) {
    const normalized = normalizePrompt(prompt);
    state.value = { chatId, ...normalized };

    if (!import.meta.client) return;

    if (
      attachmentPayloadFitsSessionStorage({
        files: normalized.files,
        documents: normalized.documents,
      })
    ) {
      sessionStorage.setItem(storageKey(chatId), JSON.stringify(normalized));
      return;
    }

    // Large image data URLs stay in memory for same-tab navigation only.
    sessionStorage.removeItem(storageKey(chatId));
  }

  function peek(chatId: string) {
    if (state.value?.chatId === chatId) {
      return normalizePrompt(state.value);
    }

    if (!import.meta.client) return null;

    const stored = sessionStorage.getItem(storageKey(chatId));
    if (!stored) return null;

    try {
      const prompt: unknown = JSON.parse(stored);
      return isPendingChatPrompt(prompt) ? normalizePrompt(prompt) : null;
    } catch {
      return null;
    }
  }

  function consume(chatId: string) {
    const prompt = peek(chatId);

    if (state.value?.chatId === chatId) {
      state.value = null;
    }
    if (import.meta.client) {
      sessionStorage.removeItem(storageKey(chatId));
    }

    return prompt;
  }

  return { set, peek, consume };
}
