import {
  backoffMs,
  canRetry,
  isLeaseExpired,
  MAX_JOB_ATTEMPTS,
  nextLeaseUntil,
} from "@chestnut-chat/api/memory/jobs";
import { resolveMemoryNamespace } from "@chestnut-chat/api/memory/namespace";
import { db } from "@chestnut-chat/db";
import { message } from "@chestnut-chat/db/schema/chat";
import { memoryItem, memoryJob } from "@chestnut-chat/db/schema/memory";
import { and, asc, eq, isNull, lt, or } from "drizzle-orm";

import type { ChatUIMessage } from "../ai/chat-types";
import { loadOwnedChat } from "./context";
import { extractAndPersistMemories } from "./extract";
import { indexProjectFile } from "./index-file";
import { enqueueMemoryJob } from "./queue";
import { summarizeChatIfNeeded } from "./summarize";

const ACTIVE_POLL_INTERVAL_MS = 2_000;
const IDLE_RECONCILE_INTERVAL_MS = 60 * 60 * 1_000;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let running = false;
let wakeRequested = false;

function scheduleTick(delayMs: number) {
  if (!started) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void tick();
  }, delayMs);
}

async function claimNextJob() {
  const now = new Date();
  const claimable = or(
    and(
      eq(memoryJob.status, "pending"),
      or(isNull(memoryJob.leaseUntil), lt(memoryJob.leaseUntil, now)),
    ),
    and(eq(memoryJob.status, "running"), lt(memoryJob.leaseUntil, now)),
  );

  const [candidate] = await db
    .select()
    .from(memoryJob)
    .where(claimable)
    .orderBy(asc(memoryJob.createdAt))
    .limit(1);

  if (!candidate) return null;
  if (candidate.status === "running" && !isLeaseExpired(candidate.leaseUntil)) return null;

  const leaseUntil = nextLeaseUntil();
  const [claimed] = await db
    .update(memoryJob)
    .set({
      status: "running",
      attempts: candidate.attempts + 1,
      leaseUntil,
      updatedAt: new Date(),
      error: null,
    })
    .where(and(eq(memoryJob.id, candidate.id), claimable))
    .returning();

  return claimed ?? null;
}

async function loadMessage(messageId: string) {
  const [row] = await db.select().from(message).where(eq(message.id, messageId)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    role: row.role as ChatUIMessage["role"],
    parts: row.parts as ChatUIMessage["parts"],
  } satisfies ChatUIMessage;
}

async function processChatReindex(job: typeof memoryJob.$inferSelect) {
  if (!job.chatId) throw new Error("chat_reindex missing chatId");

  const owned = await loadOwnedChat(job.chatId, job.userId);
  if (!owned) return;

  const namespace = resolveMemoryNamespace({
    projectId: owned.projectId,
    memoryMode: owned.project?.memoryMode ?? null,
  });

  const rows = await db
    .select({ id: message.id, role: message.role })
    .from(message)
    .where(eq(message.chatId, job.chatId))
    .orderBy(asc(message.createdAt));

  // Reset prior extraction jobs for this chat, then re-enqueue with the shared
  // "extract" dedupe key so they dedupe against the normal extraction path.
  await db
    .delete(memoryJob)
    .where(and(eq(memoryJob.chatId, job.chatId), eq(memoryJob.type, "extract")));

  let enqueued = 0;
  for (let i = 0; i < rows.length - 1; i += 1) {
    const user = rows[i];
    const assistant = rows[i + 1];
    if (user?.role !== "user" || assistant?.role !== "assistant") continue;

    const result = await enqueueMemoryJob({
      userId: job.userId,
      type: "extract",
      chatId: job.chatId,
      projectId: namespace.projectId,
      dedupeParts: ["extract", job.chatId, assistant.id],
      payload: {
        userMessageId: user.id,
        assistantMessageId: assistant.id,
      },
    });
    if (result.enqueued) enqueued += 1;
  }

  // Delete memories only after the extraction jobs are queued, so a crash in
  // between cannot leave the chat permanently unindexed.
  await db.delete(memoryItem).where(eq(memoryItem.sourceChatId, job.chatId));
  console.info("chat_reindex_jobs_enqueued", { chatId: job.chatId, enqueued });
}

async function processJob(job: typeof memoryJob.$inferSelect) {
  const started = Date.now();

  try {
    switch (job.type) {
      case "extract": {
        const payload = job.payload
          ? (JSON.parse(job.payload) as {
              userMessageId?: string;
              assistantMessageId?: string;
            })
          : {};
        if (!job.chatId || !payload.userMessageId || !payload.assistantMessageId) {
          throw new Error("extract job missing message ids");
        }
        const userMessage = await loadMessage(payload.userMessageId);
        const assistantMessage = await loadMessage(payload.assistantMessageId);
        if (!userMessage || !assistantMessage) throw new Error("extract messages missing");
        await extractAndPersistMemories({
          chatId: job.chatId,
          userId: job.userId,
          userMessage,
          assistantMessage,
        });
        break;
      }
      case "summarize": {
        if (!job.chatId) throw new Error("summarize missing chatId");
        await summarizeChatIfNeeded({ chatId: job.chatId, userId: job.userId });
        break;
      }
      case "file_index": {
        if (!job.fileId) throw new Error("file_index missing fileId");
        await indexProjectFile(job.fileId);
        break;
      }
      case "chat_reindex": {
        await processChatReindex(job);
        break;
      }
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await db
      .update(memoryJob)
      .set({ status: "completed", leaseUntil: null, updatedAt: new Date(), error: null })
      .where(eq(memoryJob.id, job.id));

    console.info("memory_job_completed", {
      id: job.id,
      type: job.type,
      latencyMs: Date.now() - started,
      attempts: job.attempts,
    });
    return null;
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    const attempts = job.attempts;
    const retry = canRetry(attempts);
    const delay = backoffMs(attempts);

    await db
      .update(memoryJob)
      .set({
        status: retry ? "pending" : "failed",
        error: messageText,
        leaseUntil: retry ? new Date(Date.now() + delay) : null,
        updatedAt: new Date(),
      })
      .where(eq(memoryJob.id, job.id));

    console.error("memory_job_failed", {
      id: job.id,
      type: job.type,
      attempts,
      maxAttempts: MAX_JOB_ATTEMPTS,
      error: messageText,
      latencyMs: Date.now() - started,
    });
    return retry ? delay : null;
  }
}

async function tick() {
  if (!started || running) return;
  running = true;
  let nextDelayMs = IDLE_RECONCILE_INTERVAL_MS;
  try {
    const job = await claimNextJob();
    if (job) {
      const retryDelayMs = await processJob(job);
      nextDelayMs = retryDelayMs ?? ACTIVE_POLL_INTERVAL_MS;
    }
  } finally {
    running = false;
    const shouldWakeImmediately = wakeRequested;
    wakeRequested = false;
    scheduleTick(shouldWakeImmediately ? 0 : nextDelayMs);
  }
}

export function startMemoryWorker() {
  if (started) return;
  started = true;
  scheduleTick(0);
  console.info("memory_worker_started", {
    activePollIntervalMs: ACTIVE_POLL_INTERVAL_MS,
    idleReconcileIntervalMs: IDLE_RECONCILE_INTERVAL_MS,
  });
}

export function wakeMemoryWorker() {
  if (!started) return;
  if (running) {
    wakeRequested = true;
    return;
  }
  scheduleTick(0);
}

export function stopMemoryWorker() {
  started = false;
  wakeRequested = false;
  if (timer) clearTimeout(timer);
  timer = null;
}
