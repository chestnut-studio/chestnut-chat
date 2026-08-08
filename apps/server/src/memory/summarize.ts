import {
  estimateTokens,
  RECENT_TURN_KEEP,
  shouldSummarize,
} from "@chestnut-chat/api/memory/budget";
import { db } from "@chestnut-chat/db";
import { message } from "@chestnut-chat/db/schema/chat";
import { chatSummary } from "@chestnut-chat/db/schema/memory";
import { generateText } from "ai";
import { asc, eq } from "drizzle-orm";

import { messageText } from "../ai/utils";
import type { ChatUIMessage } from "../ai/chat-types";
import { getMemoryChatModel } from "./models";

function partsToUi(parts: unknown): ChatUIMessage["parts"] {
  return parts as ChatUIMessage["parts"];
}

export async function summarizeChatIfNeeded(input: { chatId: string; userId: string }) {
  const model = getMemoryChatModel();
  if (!model) return { summarized: false, skipped: "memory_chat_unconfigured" as const };

  // Locate the unsummarized range with a cheap id-only query first; message
  // bodies (potentially multi-MB JSONB) are loaded only for that range.
  const allIds = await db
    .select({ id: message.id })
    .from(message)
    .where(eq(message.chatId, input.chatId))
    .orderBy(asc(message.createdAt));

  if (allIds.length <= RECENT_TURN_KEEP) {
    return { summarized: false, skipped: "too_short" as const };
  }

  const [existing] = await db
    .select()
    .from(chatSummary)
    .where(eq(chatSummary.chatId, input.chatId))
    .limit(1);

  const lastSummarizedIndex = existing?.lastMessageId
    ? allIds.findIndex((row) => row.id === existing.lastMessageId)
    : -1;

  const unsummarizedStart = lastSummarizedIndex + 1;
  const unsummarizedEnd = Math.max(0, allIds.length - RECENT_TURN_KEEP);
  const unsummarizedCount = unsummarizedEnd - unsummarizedStart;
  if (unsummarizedCount <= 0) {
    return { summarized: false, skipped: "under_threshold" as const };
  }

  const rows = await db
    .select()
    .from(message)
    .where(eq(message.chatId, input.chatId))
    .orderBy(asc(message.createdAt))
    .offset(unsummarizedStart)
    .limit(unsummarizedCount);

  const unsummarizedText = rows
    .map(
      (row) =>
        `${row.role}: ${messageText({ id: row.id, role: row.role, parts: partsToUi(row.parts) })}`,
    )
    .join("\n");

  if (!shouldSummarize(estimateTokens(unsummarizedText))) {
    return { summarized: false, skipped: "under_threshold" as const };
  }

  const result = await generateText({
    model,
    prompt: [
      "Summarize the following chat history into a concise rolling summary.",
      "Preserve durable facts, decisions, preferences, and open tasks.",
      "Do not invent details.",
      "",
      existing?.summary ? `Previous summary:\n${existing.summary}\n` : "",
      "New turns:",
      unsummarizedText,
    ].join("\n"),
  });

  const lastMessageId = rows.at(-1)?.id ?? existing?.lastMessageId ?? null;
  const summary = result.text.trim();
  if (!summary) return { summarized: false, skipped: "empty_summary" as const };

  if (existing) {
    await db
      .update(chatSummary)
      .set({ summary, lastMessageId, updatedAt: new Date() })
      .where(eq(chatSummary.id, existing.id));
  } else {
    await db.insert(chatSummary).values({
      chatId: input.chatId,
      userId: input.userId,
      summary,
      lastMessageId,
    });
  }

  return { summarized: true };
}
