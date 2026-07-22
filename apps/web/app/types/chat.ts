import type { DocumentAttachment } from "@chestnut-chat/api/chat/attachments";
import type { WebSearchProgress } from "@chestnut-chat/api/chat/web-search";
import type { UIMessage } from "ai";

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
