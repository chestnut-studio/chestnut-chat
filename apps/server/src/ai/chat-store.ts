import { db } from "@chestnut-chat/db";
import { chat, message } from "@chestnut-chat/db/schema/chat";
import { and, eq } from "drizzle-orm";
import type { UIMessage } from "ai";

export const DEFAULT_CHAT_TITLE = "New Chat";

export async function getChatTitle(chatId: string, userId: string) {
  const [ownedChat] = await db
    .select({ title: chat.title })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)));
  return ownedChat?.title ?? null;
}

export async function hasMessages(chatId: string) {
  const [existingMessage] = await db
    .select({ id: message.id })
    .from(message)
    .where(eq(message.chatId, chatId))
    .limit(1);
  return Boolean(existingMessage);
}

export async function saveUserMessage(chatId: string, userMessage: UIMessage) {
  await db.insert(message).values({ chatId, role: "user", parts: userMessage.parts });
}

export async function saveAssistantMessage(
  chatId: string,
  assistantMessage: UIMessage,
  model: string,
) {
  await db.insert(message).values({
    chatId,
    role: "assistant",
    parts: assistantMessage.parts,
    model,
  });
  await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
}
