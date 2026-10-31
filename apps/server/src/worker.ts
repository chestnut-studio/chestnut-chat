import { withMemoryJobNotifier } from "@chestnut-chat/api/memory/queue";

import { app } from "./app";
import { drainMemoryJobs } from "./memory/worker";

const DRAIN_BUDGET_MS = 50_000;

interface Bindings {
  MEMORY_QUEUE: { send(body: { type: "memory_jobs_ready" }): Promise<unknown> };
}

export default {
  fetch(request: Request, env: Bindings, ctx: Parameters<typeof app.fetch>[2]) {
    return withMemoryJobNotifier(
      () => env.MEMORY_QUEUE.send({ type: "memory_jobs_ready" }),
      () => app.fetch(request, env, ctx),
    );
  },
  async queue(batch: { retryAll(options: { delaySeconds: number }): void }) {
    const { retryAfterMs } = await drainMemoryJobs(DRAIN_BUDGET_MS);
    if (retryAfterMs !== null) {
      batch.retryAll({ delaySeconds: Math.ceil(retryAfterMs / 1_000) });
    }
  },
  scheduled(
    _controller: unknown,
    env: Bindings,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ) {
    ctx.waitUntil(env.MEMORY_QUEUE.send({ type: "memory_jobs_ready" }));
  },
};
