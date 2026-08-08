import { db } from "@chestnut-chat/db";
import {
  chat,
  message,
  type ChatLastOptions,
  type MessageMetadata,
} from "@chestnut-chat/db/schema/chat";
import { and, asc, eq, inArray } from "drizzle-orm";
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

export async function listChatMessages(chatId: string) {
  return db
    .select()
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(asc(message.createdAt));
}

/**
 * Truncate the persisted branch at/after a message for edit or regenerate.
 *
 * Deletion is driven by the message id list in insertion order instead of
 * `createdAt` comparisons, so two messages created in the same millisecond
 * cannot be mis-ordered. Missing targets are a no-op so client retries after
 * a partial failure do not 500.
 */
export async function truncateFromMessage(
  chatId: string,
  messageId: string,
  mode: "edit" | "regenerate",
) {
  const rows = await db
    .select({ id: message.id, role: message.role })
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(asc(message.createdAt));

  const targetIndex = rows.findIndex((row) => row.id === messageId);
  if (targetIndex === -1) return;

  const target = rows[targetIndex];
  if (!target) return;

  const idsToDelete = rows.slice(targetIndex + 1).map((row) => row.id);

  if (mode === "edit") {
    // Replace from the edited message onward.
    idsToDelete.unshift(target.id);
  } else if (target.role === "assistant") {
    // Regenerate: keep the target user message, drop a regenerated assistant
    // message together with everything after it.
    idsToDelete.unshift(target.id);
  }

  if (!idsToDelete.length) return;

  await db.delete(message).where(and(eq(message.chatId, chatId), inArray(message.id, idsToDelete)));
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
