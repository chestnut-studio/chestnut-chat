import { AsyncLocalStorage } from "node:async_hooks";

import { db } from "@chestnut-chat/db";
import { memoryJob } from "@chestnut-chat/db/schema/memory";

import { buildDedupeKey } from "./jobs";

const memoryJobNotifier = new AsyncLocalStorage<() => Promise<unknown>>();

export function withMemoryJobNotifier<T>(notify: () => Promise<unknown>, callback: () => T): T {
  return memoryJobNotifier.run(notify, callback);
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505"
  );
}

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
  } catch (error) {
    // Only a unique-key collision is an idempotent dedupe hit; any other
    // failure (connection, constraint) must surface so the caller can retry.
    if (!isUniqueViolation(error)) throw error;

    console.warn("memory_job_enqueue_skipped", {
      dedupeKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return { enqueued: false, dedupeKey };
  }

  try {
    await memoryJobNotifier.getStore()?.();
  } catch (error) {
    // The job is durable in Postgres; hourly reconciliation recovers it.
    console.error("memory_job_notification_failed", error);
  }
  return { enqueued: true, dedupeKey };
}

export async function enqueueChatReindex(userId: string, chatId: string, projectId: string | null) {
  await enqueueMemoryJob({
    userId,
    type: "chat_reindex",
    chatId,
    projectId,
    dedupeParts: ["chat_reindex", chatId, projectId ?? "global", String(Date.now())],
    payload: { chatId, projectId },
  });
}
