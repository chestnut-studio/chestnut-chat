import type { LanguageModel, LanguageModelUsage, UIMessage } from "ai";
import type { DocumentAttachment } from "@chestnut-chat/api/chat/attachments";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import type { WebSearchProgress } from "@chestnut-chat/api/chat/web-search";

export type ChatTitleUpdate = {
  title: string;
};

export type ChatMessageUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
};

export type ChatMessageMetadata = {
  usage?: ChatMessageUsage;
};

export type ChatUIMessage = UIMessage<
  ChatMessageMetadata,
  {
    "web-search": WebSearchProgress;
    "chat-title": ChatTitleUpdate;
    document: DocumentAttachment;
  }
>;

export function chatMessageUsageFromLanguageModelUsage(
  usage: LanguageModelUsage | undefined,
): ChatMessageUsage | undefined {
  if (!usage) return undefined;

  const inputTokens = usage.inputTokens;
  const outputTokens = usage.outputTokens;
  const totalTokens = usage.totalTokens;
  const cachedInputTokens = usage.inputTokenDetails?.cacheReadTokens;
  const reasoningTokens = usage.outputTokenDetails?.reasoningTokens;

  if (
    inputTokens == null &&
    outputTokens == null &&
    totalTokens == null &&
    cachedInputTokens == null &&
    reasoningTokens == null
  ) {
    return undefined;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cachedInputTokens,
    reasoningTokens,
  };
}

export type ChatRequestBody = {
  /** Newest UI message only; server loads authoritative history. */
  message?: ChatUIMessage;
  /** @deprecated Prefer `message`; kept for transitional clients. */
  messages?: ChatUIMessage[];
  chatId: string;
  messageId?: string;
  model?: string;
  reasoning?: boolean;
  reasoningEffort?: ReasoningEffort;
  trigger?: "submit-message" | "regenerate-message";
  webSearch?: boolean;
};

export type ChatProviderKind = "builtin" | "custom";

export type ChatModelTarget = {
  kind: ChatProviderKind;
  providerId: string;
  modelId: string;
};

export type ResolvedChatModel = {
  model: LanguageModel;
  modelId: string;
  providerId: string;
  supportsVision: boolean;
};
