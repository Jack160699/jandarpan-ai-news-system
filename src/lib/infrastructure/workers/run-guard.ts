/**
 * Worker run guard — overlap prevention + structured cron responses
 */

import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { isProductionDeployment } from "@/lib/infrastructure/production";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export type WorkerRunPayload = {
  ok: boolean;
  processed: number;
  failed: number;
  duration_ms: number;
  skipped?: boolean;
  /** Useful work happened but with tolerated degradation (soft errors). */
  degraded?: boolean;
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
export type WorkerRunLease = { acquired: boolean; release: () => Promise<void> };

const NOOP_RELEASE = async () => {};

/**
 * Overlap protection backed by a Postgres lease (public.acquire_run_lease) so it
 * works across serverless instances and is RELEASED as soon as the run finishes —
 * unlike the old Redis window lock, which held for the full window and forced
 * the previous "bypass". The TTL (windowSec) only matters if a run crashes.
 *
 * Fails OPEN on infrastructure errors: a broken lease table must never stop the
 * newsroom (worst case is the pre-existing behaviour: possible overlap).
 */
export async function acquireWorkerRunLease(
  workerKey: string,
  windowSec: number,
  options?: {
    /**
     * Default true (Vercel lanes: a broken lease table must never stop the newsroom).
     * false = FAIL CLOSED: throw `lease_unavailable` instead of proceeding without exclusion. The Edge worker uses
     * this so it can never run concurrently with the Vercel lane when the lease cannot be verified.
     */
    failOpen?: boolean;
  }
): Promise<WorkerRunLease> {
  const failOpen = options?.failOpen !== false;
  if (!isSupabaseConfigured()) {
    if (!failOpen) throw new Error("lease_unavailable: supabase_not_configured");
    const now = Date.now();
    if ((memoryLocks.get(workerKey) ?? 0) > now) {
      return { acquired: false, release: NOOP_RELEASE };
    }
    memoryLocks.set(workerKey, now + windowSec * 1000);
    return {
      acquired: true,
      release: async () => {
        memoryLocks.delete(workerKey);
      },
    };
  }

  const owner = `${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}:${crypto.randomUUID()}`;
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase.rpc("acquire_run_lease" as never, {
      p_key: workerKey,
      p_owner: owner,
      p_ttl_seconds: windowSec,
    } as never);
    if (error) throw new Error(error.message);
    if (data !== true) return { acquired: false, release: NOOP_RELEASE };
    return {
      acquired: true,
      release: async () => {
        try {
          await createAdminServerClient().rpc("release_run_lease" as never, {
            p_key: workerKey,
            p_owner: owner,
          } as never);
        } catch {
          /* lease expires on its own TTL */
        }
      },
    };
  } catch (err) {
    if (!failOpen) {
      throw new Error(`lease_unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.error(
      "[run-guard] lease unavailable, failing open:",
      err instanceof Error ? err.message : err
    );
    return { acquired: true, release: NOOP_RELEASE };
  }
}

/** Back-compat boolean API (no release). Prefer acquireWorkerRunLease. */
export async function acquireWorkerRunLock(
  workerKey: string,
  windowSec: number
): Promise<boolean> {
  if (isProductionDeployment() && !isRedisConfigured()) {
    console.warn("[run-guard] UPSTASH_REDIS not configured — using database lease only");
  }
  return (await acquireWorkerRunLease(workerKey, windowSec)).acquired;
}

export async function runWorkerEndpoint<T extends Record<string, unknown>>(
  workerKey: string,
  lockWindowSec: number,
  fn: () => Promise<{
    processed?: number;
    failed?: number;
    ok?: boolean;
    degraded?: boolean;
    details?: Record<string, unknown>;
  }>
): Promise<WorkerRunPayload> {
  const started = Date.now();

  const lease = await acquireWorkerRunLease(workerKey, lockWindowSec);
  if (!lease.acquired) {
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
    // Backward-compatible ok computation: unchanged for existing callers.
    // A worker may explicitly flag `degraded: true` to signal that its soft
    // errors were already accounted for as tolerated degradation — in that case
    // a non-zero `failed` count must NOT flip a useful run to a hard failure.
    const ok =
      result.ok !== false && (failed === 0 || result.degraded === true);

    return {
      ok,
      processed,
      failed,
      degraded: result.degraded === true,
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
  } finally {
    await lease.release();
  }
}
