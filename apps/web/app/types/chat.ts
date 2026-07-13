import type { WebSearchProgress } from "@chestnut-chat/api/chat/web-search";
import type { UIMessage } from "ai";

export type ChatUIMessage = UIMessage<
  unknown,
  {
    "web-search": WebSearchProgress;
  }
>;
