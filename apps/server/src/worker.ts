import { app } from "./app";
import { drainMemoryJobs } from "./memory/worker";

const CRON_BUDGET_MS = 50_000;

export default {
  fetch: app.fetch,
  scheduled(
    _controller: unknown,
    _env: unknown,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ) {
    ctx.waitUntil(drainMemoryJobs(CRON_BUDGET_MS));
  },
};
