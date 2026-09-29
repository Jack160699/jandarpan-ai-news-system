/**
 * Scheduler manifest — the single source of truth for WHEN each pipeline job runs.
 *
 * Why this exists: production scheduling was GitHub Actions `schedule:` (nominal
 * every 30 min, actually ~5 runs/day — GitHub throttles/drops scheduled runs) plus
 * Vercel Hobby crons (once per day maximum). The pipeline therefore ran in bursts
 * every 3–7 hours. The runtime scheduler is now Supabase pg_cron + pg_net, which
 * calls these same authenticated routes on a real clock
 * (supabase/migrations/*_083_supabase_scheduler.sql — generated from this file,
 * enforced by scheduler-manifest.test.ts).
 *
 * All cron expressions are UTC (pg_cron default). Offsets stagger jobs so heavy
 * lanes do not start in the same second.
 */

export type SchedulerJob = {
  /** Stable id; also the pg_cron job name (prefixed `jd-`) and the ops_cron_runs `job` where it matches. */
  id: string;
  label: string;
  path: string;
  method: "GET" | "POST";
  /** 5-field cron, UTC. */
  cron: string;
  /** Nominal interval, used for stall detection: a job is "stalled" after 3x this with no run. */
  everyMinutes: number;
  /** ops_cron_runs.job value this route writes (for health lookups). */
  opsJob: string;
  /** Non-critical jobs never page/flip the dashboard red on their own. */
  critical: boolean;
  /** HTTP timeout pg_net waits for a response (ms). The route keeps running server-side regardless. */
  timeoutMs: number;
};

export const SCHEDULER_JOBS: readonly SchedulerJob[] = [
  {
    id: "fetch-news",
    label: "Fetch news (RSS + NewsData + GNews)",
    path: "/api/fetch-news",
    method: "POST",
    cron: "*/10 * * * *",
    everyMinutes: 10,
    opsJob: "fetch-news",
    critical: true,
    timeoutMs: 290_000,
  },
  {
    id: "cluster",
    label: "Cluster signals into events",
    path: "/api/cron/cluster",
    method: "POST",
    cron: "3-59/10 * * * *",
    everyMinutes: 10,
    opsJob: "cluster",
    critical: true,
    timeoutMs: 290_000,
  },
  {
    id: "editorial-generate",
    label: "Editorial generation",
    path: "/api/cron/editorial-generate",
    method: "POST",
    cron: "1-59/5 * * * *",
    everyMinutes: 5,
    opsJob: "editorial-generate",
    critical: true,
    timeoutMs: 290_000,
  },
  {
    id: "orchestrate",
    label: "Orchestrate (images, snapshots, analytics)",
    path: "/api/cron/orchestrate",
    method: "POST",
    cron: "6-59/15 * * * *",
    everyMinutes: 15,
    opsJob: "orchestrate",
    critical: true,
    timeoutMs: 120_000,
  },
  {
    id: "cron-jobs",
    label: "Drain worker_jobs queue",
    path: "/api/cron/jobs",
    method: "POST",
    cron: "4-59/15 * * * *",
    everyMinutes: 15,
    opsJob: "cron_jobs",
    critical: false,
    timeoutMs: 290_000,
  },
  {
    id: "process-ai",
    label: "Legacy wire-article AI enrichment queue",
    path: "/api/process-ai",
    method: "POST",
    cron: "8-59/15 * * * *",
    everyMinutes: 15,
    opsJob: "process-ai",
    critical: false,
    timeoutMs: 60_000,
  },
  {
    id: "audio-generate",
    label: "News audio generation (Google TTS)",
    path: "/api/cron/audio-generate",
    method: "POST",
    cron: "9-59/10 * * * *",
    everyMinutes: 10,
    opsJob: "audio-generate",
    critical: false,
    timeoutMs: 290_000,
  },
  {
    id: "translation-backfill",
    label: "Translation backfill",
    path: "/api/cron/translation-backfill",
    method: "POST",
    cron: "10-59/15 * * * *",
    everyMinutes: 15,
    opsJob: "translation-backfill",
    critical: false,
    timeoutMs: 290_000,
  },
  {
    id: "edition-publish",
    label: "Edition publish slot",
    path: "/api/cron/edition-publish",
    method: "POST",
    cron: "2 * * * *",
    everyMinutes: 60,
    opsJob: "edition-publish",
    critical: true,
    timeoutMs: 60_000,
  },
  {
    id: "workers-health",
    label: "Worker health check",
    path: "/api/cron/workers/health",
    method: "GET",
    cron: "*/5 * * * *",
    everyMinutes: 5,
    opsJob: "workers-health",
    critical: false,
    timeoutMs: 30_000,
  },
  {
    id: "district-coverage",
    label: "District coverage snapshot",
    path: "/api/cron/district-coverage",
    method: "POST",
    cron: "20 * * * *",
    everyMinutes: 60,
    opsJob: "district-coverage",
    critical: false,
    timeoutMs: 60_000,
  },
  {
    id: "provider-quota-snapshot",
    label: "AI provider quota snapshot",
    path: "/api/cron/provider-quota-snapshot",
    method: "POST",
    cron: "25 * * * *",
    everyMinutes: 60,
    opsJob: "provider-quota-snapshot",
    critical: false,
    timeoutMs: 30_000,
  },
  {
    id: "verified-rates",
    label: "Verified rates refresh",
    path: "/api/cron/verified-rates",
    method: "POST",
    cron: "30 0,1,3,7,13 * * *",
    everyMinutes: 360,
    opsJob: "verified-rates",
    critical: false,
    timeoutMs: 60_000,
  },
  {
    id: "newsroom-daily-report",
    label: "Newsroom daily report",
    path: "/api/cron/newsroom-daily-report",
    method: "POST",
    cron: "30 20 * * *",
    everyMinutes: 1440,
    opsJob: "newsroom-daily-report",
    critical: false,
    timeoutMs: 60_000,
  },
  {
    id: "cleanup",
    label: "Data retention cleanup",
    path: "/api/cron/cleanup",
    method: "POST",
    cron: "30 21 * * *",
    everyMinutes: 1440,
    opsJob: "cleanup",
    critical: false,
    timeoutMs: 120_000,
  },
] as const;

export const SCHEDULER_JOB_PREFIX = "jd-";

export function schedulerJobName(id: string): string {
  return `${SCHEDULER_JOB_PREFIX}${id}`;
}

/** A job is stalled once it has not run for 3 nominal intervals (min 15 min grace). */
export function stallThresholdMs(job: Pick<SchedulerJob, "everyMinutes">): number {
  return Math.max(15, job.everyMinutes * 3) * 60_000;
}

/** Render the idempotent SQL that (re)registers every job with pg_cron. */
export function renderSchedulerSql(jobs: readonly SchedulerJob[] = SCHEDULER_JOBS): string {
  const lines: string[] = [];
  for (const job of jobs) {
    const name = schedulerJobName(job.id);
    lines.push(
      `select cron.unschedule(jobid) from cron.job where jobname = '${name}';`,
      `select cron.schedule('${name}', '${job.cron}', $job$ select public.jd_invoke_cron('${job.id}', '${job.path}', '${job.method}', ${job.timeoutMs}); $job$);`
    );
  }
  return lines.join("\n");
}
