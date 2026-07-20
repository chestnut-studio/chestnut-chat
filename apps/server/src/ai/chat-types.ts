import type { LanguageModel, UIMessage } from "ai";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import type { WebSearchProgress } from "@chestnut-chat/api/chat/web-search";

export type ChatUIMessage = UIMessage<
  unknown,
  {
    "web-search": WebSearchProgress;
  }
>;

export type ChatRequestBody = {
  messages: ChatUIMessage[];
  chatId: string;
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
};
