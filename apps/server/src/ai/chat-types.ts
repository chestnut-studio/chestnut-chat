import type { LanguageModel, UIMessage } from "ai";
import type { DocumentAttachment } from "@chestnut-chat/api/chat/attachments";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import type { WebSearchProgress } from "@chestnut-chat/api/chat/web-search";

export type ChatTitleUpdate = {
  title: string;
};

export type ChatUIMessage = UIMessage<
  unknown,
  {
    "web-search": WebSearchProgress;
    "chat-title": ChatTitleUpdate;
    document: DocumentAttachment;
  }
>;

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
