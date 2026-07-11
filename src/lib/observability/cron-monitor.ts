/**
 * Cron job monitoring — last run status + SLA tracking
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { REGISTERED_CRON_JOBS } from "@/lib/infrastructure/cron/registered-jobs";
import { opsLogger } from "@/lib/observability/logger";
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
};

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

  const maxAgeMs = Number(process.env.CRON_STALE_THRESHOLD_MS ?? 86_400_000);
  const now = Date.now();
  const staleJobs: string[] = [];

  for (const job of REGISTERED_CRON_JOBS) {
    const rec = state[job];
    if (!rec) {
      staleJobs.push(job);
      opsLogger.warn("worker_heartbeat_stale", {
        job,
        reason: "missing_heartbeat",
        expectedHeartbeat: job,
        lastHeartbeat: null,
        ageMs: null,
        thresholdMs: maxAgeMs,
      });
      continue;
    }

    const ageMs = now - new Date(rec.startedAt).getTime();
    if (ageMs > maxAgeMs) {
      staleJobs.push(job);
      opsLogger.warn("worker_heartbeat_stale", {
        job,
        reason: "heartbeat_expired",
        expectedHeartbeat: job,
        lastHeartbeat: rec.startedAt,
        ageMs,
        thresholdMs: maxAgeMs,
      });
    }
  }

  return { jobs, staleJobs };
}
