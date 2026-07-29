import { db } from "@chestnut-chat/db";
import { chat, message } from "@chestnut-chat/db/schema/chat";
import { asc, eq, isNull, sql } from "drizzle-orm";

import { enqueueMemoryJob } from "./queue";

const DEFAULT_BATCH = 25;

/** Idempotent enqueue of extract jobs for existing standalone chats. */
export async function backfillGlobalMemory(options?: { batchSize?: number; offset?: number }) {
  const batchSize = options?.batchSize ?? DEFAULT_BATCH;
  const offset = options?.offset ?? 0;

  const standaloneChats = await db
    .select({ id: chat.id, userId: chat.userId })
    .from(chat)
    .where(isNull(chat.projectId))
    .orderBy(asc(chat.createdAt))
    .limit(batchSize)
    .offset(offset);

  let enqueued = 0;

  for (const row of standaloneChats) {
    const messages = await db
      .select({ id: message.id, role: message.role })
      .from(message)
      .where(eq(message.chatId, row.id))
      .orderBy(asc(message.createdAt));

    for (let i = 0; i < messages.length - 1; i += 1) {
      const user = messages[i];
      const assistant = messages[i + 1];
      if (user?.role !== "user" || assistant?.role !== "assistant") continue;

      const result = await enqueueMemoryJob({
        userId: row.userId,
        type: "extract",
        chatId: row.id,
        projectId: null,
        dedupeParts: ["backfill_extract", row.id, assistant.id],
        payload: {
          userMessageId: user.id,
          assistantMessageId: assistant.id,
        },
      });
      if (result.enqueued) enqueued += 1;
    }
  }

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chat)
    .where(isNull(chat.projectId));
  const totalStandaloneChats = countRows[0]?.count ?? 0;

  return {
    processedChats: standaloneChats.length,
    enqueued,
    totalStandaloneChats,
    nextOffset: offset + standaloneChats.length,
    done: standaloneChats.length < batchSize,
  };
}

async function main() {
  const batchSize = Number(process.env.MEMORY_BACKFILL_BATCH ?? DEFAULT_BATCH);
  let offset = Number(process.env.MEMORY_BACKFILL_OFFSET ?? 0);
  let done = false;

  while (!done) {
    const result = await backfillGlobalMemory({ batchSize, offset });
    console.info("memory_backfill_batch", result);
    offset = result.nextOffset;
    done = result.done;
  }
}

const isDirectRun = process.argv[1]?.includes("backfill");
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
