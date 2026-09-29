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
 *
 * Hardening (migration 089, supersedes the job block of 083 - 083 is frozen because it is applied):
 *  - the dispatcher honours a DB kill switch (scheduler_control.enabled, default FALSE) and skips a dispatch
 *    when the job's run lease is already held (leaseKey), so slow runs never stack;
 *  - process-ai, workers-health (covered by admin_ops_snapshot) and the Vercel-hosted cleanup are retired;
 *  - audio-generate is registered only once Google credentials are intentionally configured;
 *  - retention runs inside the database (DB_MAINTENANCE_JOBS) - no Vercel invocation, no Vercel Pro dependency.
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
  /**
   * worker_run_leases key the route holds while running. The dispatcher skips the HTTP call while it is held.
   * null is only allowed for jobs that cannot overlap themselves (timeout < half the interval).
   */
  leaseKey: string | null;
};

/** Pure-database maintenance jobs: run inside Postgres (pg_cron), no HTTP hop, nothing on Vercel. */
export type DbMaintenanceJob = {
  id: string;
  label: string;
  cron: string;
  sql: string;
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
    leaseKey: "fetch-news",
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
    leaseKey: "cluster",
  },
  {
    id: "editorial-generate",
    label: "Editorial generation",
    path: "/api/cron/editorial-generate",
    method: "POST",
    cron: "1-59/10 * * * *",
    everyMinutes: 10,
    opsJob: "editorial-generate",
    critical: true,
    timeoutMs: 290_000,
    leaseKey: "editorial-generate",
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
    leaseKey: "orchestrate",
  },
  {
    id: "cron-jobs",
    label: "Drain worker_jobs queue",
    path: "/api/cron/jobs",
    method: "POST",
    cron: "4-59/30 * * * *",
    everyMinutes: 30,
    opsJob: "cron_jobs",
    critical: false,
    timeoutMs: 290_000,
    leaseKey: "cron_jobs",
  },
  {
    id: "translation-backfill",
    label: "Translation backfill",
    path: "/api/cron/translation-backfill",
    method: "POST",
    cron: "10-59/30 * * * *",
    everyMinutes: 30,
    opsJob: "translation-backfill",
    critical: false,
    timeoutMs: 290_000,
    leaseKey: "translation-backfill",
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
    leaseKey: "edition-publish",
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
    leaseKey: null,
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
    leaseKey: null,
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
    leaseKey: null,
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
    leaseKey: null,
  },
] as const;

/**
 * Registered only when intentionally enabled. audio-generate needs Google TTS credentials AND
 * AUDIO_GENERATION_ENABLED=true on the app; until then the job is unscheduled so no invocation is wasted.
 * To enable: move the entry into SCHEDULER_JOBS and regenerate a new migration.
 */
export const DISABLED_SCHEDULER_JOBS: readonly SchedulerJob[] = [
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
    leaseKey: "audio-generate",
  },
] as const;

/** Job ids registered by an earlier migration that the current one must unschedule. */
export const RETIRED_SCHEDULER_JOB_IDS: readonly string[] = [
  // Legacy wire-article enrichment; the editorial pipeline does not depend on it and it burned AI quota.
  "process-ai",
  // Covered by admin_ops_snapshot job-health evaluation (12 invocations/hour for no unique signal).
  "workers-health",
  // Replaced by the database-side prune-storage job (bounded, no Vercel invocation).
  "cleanup",
  // Replaced by prune-scheduler-logs.
  "scheduler-log-cleanup",
] as const;

/** Runs entirely inside Postgres. Retention is gated by scheduler_control.prune_enabled (default false). */
export const DB_MAINTENANCE_JOBS: readonly DbMaintenanceJob[] = [
  {
    id: "prune-scheduler-logs",
    label: "Prune scheduler/cron history (cron.job_run_details, dispatch log)",
    cron: "40 21 * * *",
    sql: "select public.jd_prune_scheduler_logs();",
  },
  {
    id: "prune-storage",
    label: "Bounded retention for large tables (Supabase Free 500 MB guard)",
    cron: "50 21 * * *",
    sql: "select public.jd_prune_storage();",
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

/**
 * Render the idempotent SQL that (re)registers every job with pg_cron.
 * Order: unschedule retired + disabled, then (re)register active HTTP jobs, then DB maintenance jobs.
 */
export function renderSchedulerSql(
  jobs: readonly SchedulerJob[] = SCHEDULER_JOBS,
  opts: {
    disabled?: readonly SchedulerJob[];
    retiredIds?: readonly string[];
    maintenance?: readonly DbMaintenanceJob[];
  } = {}
): string {
  const disabled = opts.disabled ?? DISABLED_SCHEDULER_JOBS;
  const retiredIds = opts.retiredIds ?? RETIRED_SCHEDULER_JOB_IDS;
  const maintenance = opts.maintenance ?? DB_MAINTENANCE_JOBS;
  const lines: string[] = [];
  const unschedule = (name: string) =>
    lines.push(`select cron.unschedule(jobid) from cron.job where jobname = '${name}';`);

  for (const id of retiredIds) unschedule(schedulerJobName(id));
  for (const job of disabled) unschedule(schedulerJobName(job.id));
  for (const job of jobs) {
    const name = schedulerJobName(job.id);
    const lease = job.leaseKey === null ? "null" : `'${job.leaseKey}'`;
    unschedule(name);
    lines.push(
      `select cron.schedule('${name}', '${job.cron}', $job$ select public.jd_invoke_cron('${job.id}', '${job.path}', '${job.method}', ${job.timeoutMs}, ${lease}); $job$);`
    );
  }
  for (const job of maintenance) {
    const name = schedulerJobName(job.id);
    unschedule(name);
    lines.push(`select cron.schedule('${name}', '${job.cron}', $job$ ${job.sql} $job$);`);
  }
  return lines.join("\n");
}
