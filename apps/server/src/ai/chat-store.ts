import { db } from "@chestnut-chat/db";
import {
  chat,
  message,
  type ChatLastOptions,
  type MessageMetadata,
} from "@chestnut-chat/db/schema/chat";
import { and, asc, eq, gt, gte } from "drizzle-orm";
import type { UIMessage } from "ai";

export const DEFAULT_CHAT_TITLE = "New Chat";

export async function getChatTitle(chatId: string, userId: string) {
  const [ownedChat] = await db
    .select({ title: chat.title })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)));
  return ownedChat?.title ?? null;
}

export async function saveChatLastOptions(
  chatId: string,
  userId: string,
  lastOptions: ChatLastOptions,
) {
  await db
    .update(chat)
    .set({ lastOptions, updatedAt: new Date() })
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)));
}

export async function hasMessages(chatId: string) {
  const [existingMessage] = await db
    .select({ id: message.id })
    .from(message)
    .where(eq(message.chatId, chatId))
    .limit(1);
  return Boolean(existingMessage);
}

export async function listChatMessages(chatId: string) {
  return db
    .select()
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(asc(message.createdAt));
}

/** Truncate the persisted branch at/after a message for edit or regenerate. */
export async function truncateFromMessage(
  chatId: string,
  messageId: string,
  mode: "edit" | "regenerate",
) {
  const [target] = await db
    .select()
    .from(message)
    .where(and(eq(message.id, messageId), eq(message.chatId, chatId)))
    .limit(1);

  if (!target) {
    throw new Error("Message not found for truncate");
  }

  if (mode === "edit") {
    await db
      .delete(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, target.createdAt)));
    return;
  }

  // regenerate: keep the target user message; delete everything after it
  await db
    .delete(message)
    .where(and(eq(message.chatId, chatId), gt(message.createdAt, target.createdAt)));

  // If regenerating an assistant message, delete that assistant message too.
  if (target.role === "assistant") {
    await db.delete(message).where(and(eq(message.id, target.id), eq(message.chatId, chatId)));
  }
}

export async function saveUserMessage(chatId: string, userMessage: UIMessage) {
  const [row] = await db
    .insert(message)
    .values({
      id: userMessage.id || crypto.randomUUID(),
      chatId,
      role: "user",
      parts: userMessage.parts,
    })
    .returning();
  return row;
}

export async function saveAssistantMessage(
  chatId: string,
  assistantMessage: UIMessage,
  model: string,
) {
  const [row] = await db
    .insert(message)
    .values({
      id: assistantMessage.id || crypto.randomUUID(),
      chatId,
      role: "assistant",
      parts: assistantMessage.parts,
      metadata: (assistantMessage.metadata as MessageMetadata | null | undefined) ?? null,
      model,
    })
    .returning();
  await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
  return row;
}
