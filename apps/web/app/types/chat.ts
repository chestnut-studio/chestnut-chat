import type { DocumentAttachment } from "@chestnut-chat/api/chat/attachments";
import type { WebSearchProgress } from "@chestnut-chat/api/chat/web-search";
import type { UIMessage } from "ai";

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
