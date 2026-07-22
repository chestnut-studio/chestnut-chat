import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";

export type PendingChatPrompt = {
  text: string;
  model: string;
  reasoning: boolean;
  reasoningEffort: ReasoningEffort;
  webSearch: boolean;
};

type StoredPendingChatPrompt = PendingChatPrompt & {
  chatId: string;
};

const STORAGE_PREFIX = "pending-chat-prompt:";

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
    typeof prompt.webSearch === "boolean"
  );
}

export function usePendingChatPrompt() {
  const state = useState<StoredPendingChatPrompt | null>("pending-chat-prompt", () => null);

  function storageKey(chatId: string) {
    return `${STORAGE_PREFIX}${chatId}`;
  }

  function set(chatId: string, prompt: PendingChatPrompt) {
    state.value = { chatId, ...prompt };

    if (import.meta.client) {
      sessionStorage.setItem(storageKey(chatId), JSON.stringify(prompt));
    }
  }

  function peek(chatId: string) {
    if (state.value?.chatId === chatId) {
      return {
        text: state.value.text,
        model: state.value.model,
        reasoning: state.value.reasoning,
        reasoningEffort: state.value.reasoningEffort,
        webSearch: state.value.webSearch,
      };
    }

    if (!import.meta.client) return null;

    const stored = sessionStorage.getItem(storageKey(chatId));
    if (!stored) return null;

    try {
      const prompt: unknown = JSON.parse(stored);
      return isPendingChatPrompt(prompt) ? prompt : null;
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
