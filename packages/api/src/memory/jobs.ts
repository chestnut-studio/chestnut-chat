export const MAX_JOB_ATTEMPTS = 5;
export const JOB_LEASE_MS = 5 * 60 * 1000;

export function backoffMs(attempts: number) {
  const base = 1_000;
  const capped = Math.min(attempts, 8);
  return base * 2 ** Math.max(0, capped - 1);
}

export function isLeaseExpired(leaseUntil: Date | string | null | undefined, now = Date.now()) {
  if (!leaseUntil) return true;
  return new Date(leaseUntil).getTime() <= now;
}

export function nextLeaseUntil(now = Date.now()) {
  return new Date(now + JOB_LEASE_MS);
}

export function canRetry(attempts: number) {
  return attempts < MAX_JOB_ATTEMPTS;
}

export function buildDedupeKey(parts: Array<string | number | null | undefined>) {
  return parts.filter((part) => part !== null && part !== undefined && part !== "").join(":");
}
