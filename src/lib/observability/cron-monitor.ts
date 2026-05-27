/**
 * Cron job monitoring — last run status + SLA tracking
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
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
  workers?: WorkerResult[];
  error?: string;
};

type CronState = Record<string, CronRunRecord>;

export async function recordCronRun(record: CronRunRecord): Promise<void> {
  const state = (await cacheGetJson<CronState>(CRON_STATE_KEY)) ?? {};
  state[record.job] = record;
  await cacheSetJson(CRON_STATE_KEY, state, CRON_TTL_SEC);

  opsLogger.info("worker_heartbeat_updated", {
    job: record.job,
    ok: record.ok,
    startedAt: record.startedAt,
    durationMs: record.durationMs,
    degraded: record.degraded ?? false,
  });

  opsLogger.info("cron_run_recorded", {
    job: record.job,
    ok: record.ok,
    durationMs: record.durationMs,
    degraded: record.degraded,
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

  const expectedJobs = ["orchestrate", "fetch-news", "cluster", "revalidate"];
  for (const job of expectedJobs) {
    const rec = state[job];
    if (!rec) {
      staleJobs.push(job);
      opsLogger.warn("worker_marked_stale", {
        job,
        reason: "missing_heartbeat",
      });
      continue;
    }
    if (now - new Date(rec.startedAt).getTime() > maxAgeMs) {
      staleJobs.push(job);
      opsLogger.warn("worker_marked_stale", {
        job,
        reason: "heartbeat_expired",
        startedAt: rec.startedAt,
        maxAgeMs,
      });
    }
  }

  return { jobs, staleJobs };
}
