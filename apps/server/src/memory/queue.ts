import { buildDedupeKey } from "@chestnut-chat/api/memory/jobs";
import { db } from "@chestnut-chat/db";
import { memoryJob } from "@chestnut-chat/db/schema/memory";

export async function enqueueMemoryJob(input: {
  userId: string;
  type: "extract" | "summarize" | "file_index" | "chat_reindex";
  chatId?: string | null;
  projectId?: string | null;
  fileId?: string | null;
  payload?: Record<string, unknown>;
  dedupeParts?: Array<string | null | undefined>;
}) {
  const dedupeKey =
    buildDedupeKey(input.dedupeParts ?? [input.type, input.chatId, input.fileId, Date.now()]) ||
    crypto.randomUUID();

  try {
    await db.insert(memoryJob).values({
      userId: input.userId,
      type: input.type,
      status: "pending",
      chatId: input.chatId ?? null,
      projectId: input.projectId ?? null,
      fileId: input.fileId ?? null,
      dedupeKey,
      payload: input.payload ? JSON.stringify(input.payload) : null,
    });
    return { enqueued: true, dedupeKey };
  } catch (error) {
    // Unique dedupe key collisions are treated as idempotent success.
    console.warn("memory_job_enqueue_skipped", {
      dedupeKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return { enqueued: false, dedupeKey };
  }
}

export async function enqueuePostChatJobs(input: {
  userId: string;
  chatId: string;
  projectId: string | null;
  userMessageId: string;
  assistantMessageId: string;
}) {
  await enqueueMemoryJob({
    userId: input.userId,
    type: "extract",
    chatId: input.chatId,
    projectId: input.projectId,
    dedupeParts: ["extract", input.chatId, input.assistantMessageId],
    payload: {
      userMessageId: input.userMessageId,
      assistantMessageId: input.assistantMessageId,
    },
  });

  await enqueueMemoryJob({
    userId: input.userId,
    type: "summarize",
    chatId: input.chatId,
    projectId: input.projectId,
    dedupeParts: ["summarize", input.chatId, input.assistantMessageId],
  });
}
