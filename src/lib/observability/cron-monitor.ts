/**
 * Cron job monitoring — last run status + SLA tracking
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { REGISTERED_CRON_JOBS } from "@/lib/infrastructure/cron/registered-jobs";
import {
  isRetiredCronJob,
  staleThresholdForJob,
} from "@/lib/infrastructure/cron/retired-jobs";
import { opsLogger } from "@/lib/observability/logger";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkerResult } from "@/lib/infrastructure/workers/types";

const CRON_STATE_KEY = "ops:cron:last-runs:v1";
const CRON_TTL_SEC = 86_400;

export type CronRunRecord = {
  job: string;
  ok: boolean;
  startedAt: string;
  durationMs: number;
  degraded?: boolean;
  entityCount?: number;
  requestId?: string;
  workers?: WorkerResult[];
  error?: string;
  metadata?: Record<string, unknown>;
  /** scheduler | manual | github | vercel | unknown */
  trigger?: string;
  processed?: number;
  skipped?: number;
  failed?: number;
};

/** Best-effort trigger attribution from the request that started the run. */
export function detectCronTrigger(request?: Request): string {
  if (!request) return "unknown";
  const ua = request.headers.get("user-agent") ?? "";
  if (/jandarpan-supabase-scheduler/i.test(ua)) return "scheduler";
  if (request.headers.get("x-jd-manual-run")) return "manual";
  if (request.headers.get("x-vercel-cron") === "1" || /vercel-cron/i.test(ua)) return "vercel";
  if (/curl|github/i.test(ua)) return "github";
  return "unknown";
}

type CronState = Record<string, CronRunRecord>;

export { REGISTERED_CRON_JOBS } from "@/lib/infrastructure/cron/registered-jobs";
export type { RegisteredCronJobId } from "@/lib/infrastructure/cron/registered-jobs";

function heartbeatStatus(record: CronRunRecord): string {
  if (!record.ok) return "failed";
  if (record.degraded) return "degraded";
  return "ok";
}

export async function recordCronRun(record: CronRunRecord): Promise<void> {
  const state = (await cacheGetJson<CronState>(CRON_STATE_KEY)) ?? {};
  state[record.job] = record;
  await cacheSetJson(CRON_STATE_KEY, state, CRON_TTL_SEC);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminServerClient();
      await supabase.from("ops_cron_runs").insert({
        job: record.job,
        ok: record.ok,
        duration_ms: record.durationMs,
        degraded: record.degraded ?? false,
        workers: record.workers ?? null,
        error: record.error ?? null,
        started_at: record.startedAt,
        run_id: record.requestId ?? null,
        trigger: record.trigger ?? null,
        processed: record.processed ?? record.entityCount ?? null,
        skipped: record.skipped ?? null,
        failed: record.failed ?? null,
        metadata: (record.metadata ?? null) as never,
      } as never);
    } catch {
      /* best-effort durability */
    }
  }

  opsLogger.info("heartbeat_recorded", {
    job: record.job,
    startedAt: record.startedAt,
    durationMs: record.durationMs,
    duration_ms: record.durationMs,
    status: heartbeatStatus(record),
    ok: record.ok,
    degraded: record.degraded ?? false,
    entity_count: record.entityCount,
    request_id: record.requestId,
  });
}

export async function getCronMonitorState(): Promise<{
  jobs: CronRunRecord[];
  staleJobs: string[];
}> {
  const state = (await cacheGetJson<CronState>(CRON_STATE_KEY)) ?? {};
  const jobs = Object.values(state).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const defaultMaxAgeMs = Number(
    process.env.CRON_STALE_THRESHOLD_MS ?? 86_400_000
  );
  const now = Date.now();
  const staleJobs: string[] = [];

  // Drop retired ids from cached state so they never resurface as stale.
  for (const job of Object.keys(state)) {
    if (isRetiredCronJob(job)) {
      delete state[job];
    }
  }

  for (const job of REGISTERED_CRON_JOBS) {
    if (isRetiredCronJob(job)) continue;

    const thresholdMs = staleThresholdForJob(job, defaultMaxAgeMs);
    const rec = state[job];
    if (!rec) {
      staleJobs.push(job);
      opsLogger.warn("worker_heartbeat_stale", {
        job,
        reason: "missing_heartbeat",
        expectedHeartbeat: job,
        lastHeartbeat: null,
        ageMs: null,
        thresholdMs,
      });
      continue;
    }

    const ageMs = now - new Date(rec.startedAt).getTime();
    if (ageMs > thresholdMs) {
      staleJobs.push(job);
      opsLogger.warn("worker_heartbeat_stale", {
        job,
        reason: "heartbeat_expired",
        expectedHeartbeat: job,
        lastHeartbeat: rec.startedAt,
        ageMs,
        thresholdMs,
      });
    }
  }

  return {
    jobs: jobs.filter((j) => !isRetiredCronJob(j.job)),
    staleJobs,
  };
}
