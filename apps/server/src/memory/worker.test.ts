import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { memoryJob } from "@chestnut-chat/db/schema/memory";
import { enqueueMemoryJob, withMemoryJobNotifier } from "@chestnut-chat/api/memory/queue";

import worker from "../worker";
import { drainMemoryJobs, startMemoryWorker, stopMemoryWorker, wakeMemoryWorker } from "./worker";

const { client, db, queries } = await vi.hoisted(async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite();
  const queries: string[] = [];
  return {
    client,
    queries,
    db: drizzle(client, { logger: { logQuery: (sql) => queries.push(sql) } }),
  };
});

vi.mock("@chestnut-chat/db", () => ({ db }));
vi.mock("@chestnut-chat/env/server", () => ({ env: { NODE_ENV: "test" } }));
vi.mock("../app", async () => {
  const { Hono } = await import("hono");
  const { enqueueMemoryJob, enqueueChatReindex } = await import("@chestnut-chat/api/memory/queue");
  const { enqueuePostChatJobs } = await import("./queue");
  const app = new Hono();
  app.post("/jobs", async (c) => {
    const result = await enqueueMemoryJob({
      userId: "user-1",
      type: "summarize",
      chatId: "chat-1",
      dedupeParts: ["request-job"],
    });
    return c.json(result);
  });
  app.post("/reindex", async (c) => {
    await enqueueChatReindex("user-1", "chat-1", "project-1");
    return c.text("OK");
  });
  app.get("/stream", () => {
    let firstChunk = true;
    return new Response(
      new ReadableStream({
        async pull(controller) {
          if (firstChunk) {
            firstChunk = false;
            controller.enqueue(new TextEncoder().encode("chat response"));
            return;
          }
          await enqueuePostChatJobs({
            userId: "user-1",
            chatId: "chat-1",
            projectId: null,
            userMessageId: "message-1",
            assistantMessageId: "message-2",
          });
          controller.close();
        },
      }),
    );
  });
  return { app };
});

beforeAll(async () => {
  await client.exec(`CREATE TABLE memory_job (
    id text PRIMARY KEY, user_id text NOT NULL, type text NOT NULL,
    status text NOT NULL DEFAULT 'pending', chat_id text, project_id text, file_id text,
    dedupe_key text NOT NULL UNIQUE, attempts integer NOT NULL DEFAULT 0,
    lease_until timestamp, error text, payload text,
    created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
  )`);
});

beforeEach(async () => {
  await client.exec("TRUNCATE memory_job");
});

afterEach(() => {
  stopMemoryWorker();
  vi.useRealTimers();
});

afterAll(async () => {
  await client.close();
});

describe("event-driven memory processing", () => {
  it("notifies immediately for HTTP and streamed chat jobs, including reindexing", async () => {
    const notifications: unknown[] = [];
    const env = {
      MEMORY_QUEUE: {
        send: async (body: unknown) => {
          notifications.push(body);
        },
      },
    };

    const response = await worker.fetch(
      new Request("https://test/jobs", { method: "POST" }),
      env,
      undefined,
    );
    expect(response.status).toBe(200);
    expect(notifications).toHaveLength(1);
    expect((await db.select().from(memoryJob)).map((job) => job.status)).toEqual(["pending"]);

    await worker.queue({
      retryAll: () => {
        throw new Error("Unexpected retry");
      },
    });
    expect((await db.select().from(memoryJob))[0]).toMatchObject({
      status: "completed",
      attempts: 1,
    });

    const stream = await worker.fetch(new Request("https://test/stream"), env, undefined);
    expect(await stream.text()).toBe("chat response");
    await worker.fetch(new Request("https://test/reindex", { method: "POST" }), env, undefined);
    expect(notifications).toEqual(Array(4).fill({ type: "memory_jobs_ready" }));
    expect((await db.select().from(memoryJob)).map((job) => job.type).sort()).toEqual([
      "chat_reindex",
      "extract",
      "summarize",
      "summarize",
    ]);
  });

  it("stops querying after draining an empty queue", async () => {
    await enqueueMemoryJob({ userId: "user-1", type: "summarize", chatId: "chat-1" });
    await worker.queue({
      retryAll: () => {
        throw new Error("Unexpected retry");
      },
    });
    const queryCount = queries.length;
    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1_000);
    expect(queries.length).toBe(queryCount);
    expect((await db.select().from(memoryJob))[0]?.status).toBe("completed");
  });

  it("retries with backoff without blocking new jobs, then stops at the attempt limit", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await enqueueMemoryJob({ userId: "user-1", type: "summarize", dedupeParts: ["invalid"] });
    await enqueueMemoryJob({
      userId: "user-1",
      type: "summarize",
      chatId: "chat-1",
      dedupeParts: ["valid"],
    });
    let retrySeconds: number | undefined;
    const batch = {
      retryAll: ({ delaySeconds }: { delaySeconds: number }) => {
        retrySeconds = delaySeconds;
      },
    };

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      retrySeconds = undefined;
      await worker.queue(batch);
      const jobs = await db.select().from(memoryJob).orderBy(memoryJob.dedupeKey);
      expect(jobs[0]).toMatchObject({
        attempts: attempt,
        status: attempt === 5 ? "failed" : "pending",
      });
      expect(jobs[1]).toMatchObject({ status: "completed", attempts: 1 });
      if (attempt < 5) {
        expect(retrySeconds).toBe(2 ** (attempt - 1));
        await worker.queue(batch);
        expect(
          (await db.select().from(memoryJob).where(eq(memoryJob.dedupeKey, "invalid")))[0]
            ?.attempts,
        ).toBe(attempt);
        vi.setSystemTime(Date.now() + retrySeconds! * 1_000 + 1);
      } else {
        expect(retrySeconds).toBeUndefined();
      }
    }
  });

  it("waits for an existing lease before recovering an interrupted job", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await enqueueMemoryJob({ userId: "user-1", type: "summarize", chatId: "chat-1" });
    await db
      .update(memoryJob)
      .set({ status: "running", attempts: 1, leaseUntil: new Date(Date.now() + 90_000) });
    const delays: number[] = [];
    const batch = {
      retryAll: ({ delaySeconds }: { delaySeconds: number }) => {
        delays.push(delaySeconds);
      },
    };
    await worker.queue(batch);
    expect(delays).toEqual([90]);
    expect((await db.select().from(memoryJob))[0]).toMatchObject({
      status: "running",
      attempts: 1,
    });
    vi.setSystemTime(Date.now() + 90_001);
    await worker.queue(batch);
    expect((await db.select().from(memoryJob))[0]).toMatchObject({
      status: "completed",
      attempts: 2,
    });
    expect(delays).toEqual([90]);
  });

  it("retains jobs when notification fails and recovers them on reconciliation", async () => {
    await withMemoryJobNotifier(
      async () => {
        throw new Error("Queue unavailable");
      },
      () => enqueueMemoryJob({ userId: "user-1", type: "summarize", chatId: "chat-1" }),
    );
    expect((await db.select().from(memoryJob))[0]?.status).toBe("pending");
    const tasks: Promise<unknown>[] = [];
    worker.scheduled(
      undefined,
      {
        MEMORY_QUEUE: {
          send: async () =>
            worker.queue({
              retryAll: () => {
                throw new Error("Unexpected retry");
              },
            }),
        },
      },
      {
        waitUntil: (promise) => {
          tasks.push(promise);
        },
      },
    );
    await Promise.all(tasks);
    expect((await db.select().from(memoryJob))[0]?.status).toBe("completed");
  });

  it("requests continuation when its processing budget is exhausted", async () => {
    await enqueueMemoryJob({ userId: "user-1", type: "summarize", chatId: "chat-1" });
    expect(await drainMemoryJobs(0)).toEqual({ processed: 0, retryAfterMs: 0 });
    expect((await db.select().from(memoryJob))[0]?.status).toBe("pending");
    expect(await drainMemoryJobs(1_000)).toEqual({ processed: 1, retryAfterMs: null });
  });

  it("still wakes the Node worker immediately for newly saved jobs", async () => {
    startMemoryWorker();
    for (const chatId of ["chat-1", "chat-2"]) {
      await withMemoryJobNotifier(
        async () => wakeMemoryWorker(),
        () => enqueueMemoryJob({ userId: "user-1", type: "summarize", chatId }),
      );
      await vi.waitFor(async () => {
        const [job] = await db.select().from(memoryJob).where(eq(memoryJob.chatId, chatId));
        expect(job?.status).toBe("completed");
      });
    }
  });
});
