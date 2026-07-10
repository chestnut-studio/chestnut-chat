import type { LanguageModel, UIMessage } from "ai";

export type ChatRequestBody = {
  messages: UIMessage[];
  chatId: string;
  model?: string;
  reasoning?: boolean;
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
