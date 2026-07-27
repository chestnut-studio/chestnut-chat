import { filterMemoryCandidates } from "@chestnut-chat/api/memory/filter";
import { resolveMemoryNamespace } from "@chestnut-chat/api/memory/namespace";
import { db } from "@chestnut-chat/db";
import { memoryItem } from "@chestnut-chat/db/schema/memory";
import { generateObject } from "ai";
import { z } from "zod";

import { messageText } from "../ai/utils";
import type { ChatUIMessage } from "../ai/chat-types";
import { embedTexts } from "./embeddings";
import { getMemoryChatModel } from "./models";
import { loadOwnedChat } from "./context";

const extractionSchema = z.object({
  items: z
    .array(
      z.object({
        memoryKey: z.string(),
        memoryType: z.enum(["fact", "preference", "goal", "decision", "constraint"]),
        content: z.string(),
        importance: z.number().min(0).max(1).optional(),
      }),
    )
    .max(5),
});

export async function extractAndPersistMemories(input: {
  chatId: string;
  userId: string;
  userMessage: ChatUIMessage;
  assistantMessage: ChatUIMessage;
}) {
  const model = getMemoryChatModel();
  if (!model) return { saved: 0, skipped: "memory_chat_unconfigured" as const };

  const owned = await loadOwnedChat(input.chatId, input.userId);
  if (!owned) return { saved: 0, skipped: "chat_not_found" as const };

  const namespace = resolveMemoryNamespace({
    projectId: owned.projectId,
    memoryMode: owned.project?.memoryMode ?? null,
  });

  const transcript = [
    `User: ${messageText(input.userMessage)}`,
    `Assistant: ${messageText(input.assistantMessage)}`,
  ].join("\n");

  const result = await generateObject({
    model,
    schema: extractionSchema,
    prompt: [
      "Extract at most five durable user facts, preferences, goals, decisions, or constraints.",
      "Ignore passwords, API keys, auth codes, and one-off transient requests.",
      "Use stable snake_case memoryKey values.",
      "",
      transcript,
    ].join("\n"),
  });

  const accepted = filterMemoryCandidates(result.object.items, 5);
  if (!accepted.length) return { saved: 0 };

  const embeddings = await embedTexts(accepted.map((item) => item.content));
  const values = accepted.map((item, index) => ({
    userId: input.userId,
    projectId: namespace.projectId,
    sourceChatId: input.chatId,
    sourceMessageId: input.userMessage.id,
    memoryKey: item.memoryKey,
    memoryType: item.memoryType,
    content: item.content,
    importance: item.importance ?? 0.5,
    embedding: embeddings?.[index] ?? null,
  }));

  await db.insert(memoryItem).values(values);
  return { saved: values.length };
}
