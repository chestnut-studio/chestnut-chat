import { describe, expect, it } from "vitest";

import { backoffMs, canRetry, isLeaseExpired, MAX_JOB_ATTEMPTS } from "./jobs";

describe("job leasing helpers", () => {
  it("uses exponential backoff and caps retries", () => {
    expect(backoffMs(1)).toBe(1_000);
    expect(backoffMs(3)).toBe(4_000);
    expect(canRetry(MAX_JOB_ATTEMPTS - 1)).toBe(true);
    expect(canRetry(MAX_JOB_ATTEMPTS)).toBe(false);
  });

  it("detects expired leases", () => {
    expect(isLeaseExpired(null)).toBe(true);
    expect(isLeaseExpired(new Date(Date.now() - 1_000))).toBe(true);
    expect(isLeaseExpired(new Date(Date.now() + 60_000))).toBe(false);
  });
});
