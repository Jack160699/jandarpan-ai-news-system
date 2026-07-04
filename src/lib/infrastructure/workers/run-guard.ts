/**
 * Worker run guard — overlap prevention + structured cron responses
 */

import { isDuplicateRequest } from "@/lib/infrastructure/cache/dedup";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { isProductionDeployment } from "@/lib/infrastructure/production";

export type WorkerRunPayload = {
  ok: boolean;
  processed: number;
  failed: number;
  duration_ms: number;
  skipped?: boolean;
  reason?: string;
  details?: Record<string, unknown>;
};

const memoryLocks = new Map<string, number>();

export function isCacheDegraded(): boolean {
  return !isRedisConfigured();
}

/**
 * Prevents overlapping cron invocations (GitHub Actions + manual triggers).
 * Uses Redis/memory dedup when available; falls back to in-process lock.
 */
export async function acquireWorkerRunLock(
  workerKey: string,
  windowSec: number
): Promise<boolean> {
  if (isProductionDeployment() && !isRedisConfigured()) {
    console.error(
      "[run-guard] UPSTASH_REDIS not configured in production — worker overlap protection is degraded"
    );
  }

  const duplicate = await isDuplicateRequest(`worker:lock:${workerKey}`, windowSec);
  if (duplicate) return false;

  const now = Date.now();
  const until = memoryLocks.get(workerKey) ?? 0;
  if (until > now) return false;
  memoryLocks.set(workerKey, now + windowSec * 1000);
  return true;
}

export async function runWorkerEndpoint<T extends Record<string, unknown>>(
  workerKey: string,
  lockWindowSec: number,
  fn: () => Promise<{
    processed?: number;
    failed?: number;
    ok?: boolean;
    details?: Record<string, unknown>;
  }>
): Promise<WorkerRunPayload> {
  const started = Date.now();

  const acquired = await acquireWorkerRunLock(workerKey, lockWindowSec);
  if (!acquired) {
    return {
      ok: true,
      processed: 0,
      failed: 0,
      duration_ms: Date.now() - started,
      skipped: true,
      reason: "overlap_lock",
    };
  }

  try {
    const result = await fn();
    const processed = result.processed ?? 0;
    const failed = result.failed ?? 0;
    const ok = result.ok !== false && failed === 0;

    return {
      ok,
      processed,
      failed,
      duration_ms: Date.now() - started,
      details: {
        ...result.details,
        cache_degraded: isCacheDegraded(),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "worker_exception";
    return {
      ok: false,
      processed: 0,
      failed: 1,
      duration_ms: Date.now() - started,
      reason: msg,
    };
  }
}
