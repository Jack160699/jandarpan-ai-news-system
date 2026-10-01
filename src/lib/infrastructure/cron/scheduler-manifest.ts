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

/**
 * A job served by a Supabase Edge Function. One logical job (one dashboard row, one ops_cron_runs.job) may be
 * dispatched several times per cycle - one entry per shard - so every invocation stays small and bounded.
 */
export type EdgeSchedulerJob = {
  id: string;
  label: string;
  /** Edge Function slug (supabase/functions/<function>). */
  function: string;
  /** ops_cron_runs.job the worker records under (shared by all shards). */
  opsJob: string;
  critical: boolean;
  /** Nominal interval of the whole cycle, used for stall detection. */
  everyMinutes: number;
  timeoutMs: number;
  dispatches: ReadonlyArray<{
    /** Appended to the pg_cron name: jd-edge-<id>[-<suffix>]. */
    suffix: string;
    cron: string;
    body: Record<string, unknown>;
    /** worker_run_leases key the worker holds while running (dispatcher skips while held). */
    leaseKey: string | null;
  }>;
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

/** RSS feeds are split into this many shards per ingestion cycle (every feed polled once per cycle). */
export const FETCH_SHARDS = 10;

/**
 * The heavy recurring pipeline, served by Supabase Edge Functions so Vercel Hobby only carries the website.
 *  - fetch: 10 shards (~10 feeds each), one per minute offset, every 10 min
 *  - cluster: every 10 min
 *  - editorial: wakes every 5 min but processes EXACTLY ONE candidate per wake, behind the lease, the Redis quota governor,
 *    the per-run LLM budget, persistent backoff and the circuit breaker (no burst is possible)
 *  - translation: every 30 min, small batch
 */
export const EDGE_SCHEDULER_JOBS: readonly EdgeSchedulerJob[] = [
  {
    id: "fetch-news",
    label: "Fetch news (RSS shards + NewsData + GNews)",
    function: "fetch-worker",
    opsJob: "fetch-news",
    critical: true,
    everyMinutes: 10,
    timeoutMs: 150_000,
    dispatches: Array.from({ length: FETCH_SHARDS }, (_, i) => ({
      suffix: String(i),
      cron: `${i}-59/10 * * * *`,
      body: { shard: i, shards: FETCH_SHARDS },
      leaseKey: `edge-fetch-${FETCH_SHARDS}-${i}`,
    })),
  },
  {
    id: "cluster",
    label: "Cluster signals into events",
    function: "cluster-worker",
    opsJob: "cluster",
    critical: true,
    everyMinutes: 10,
    timeoutMs: 150_000,
    dispatches: [{ suffix: "", cron: "7-59/10 * * * *", body: {}, leaseKey: "edge-cluster" }],
  },
  {
    id: "editorial-generate",
    label: "Editorial generation (1 story per wake)",
    function: "editorial-worker",
    opsJob: "editorial-generate",
    critical: true,
    everyMinutes: 5,
    timeoutMs: 150_000,
    dispatches: [{ suffix: "", cron: "2-59/5 * * * *", body: {}, leaseKey: "editorial-generate" }],
  },
  {
    id: "translation",
    label: "Translation backfill",
    function: "translation-worker",
    opsJob: "translation-backfill",
    critical: false,
    everyMinutes: 30,
    timeoutMs: 150_000,
    dispatches: [{ suffix: "", cron: "10-59/30 * * * *", body: {}, leaseKey: "edge-translation" }],
  },
] as const;

export const EDGE_JOB_PREFIX = "jd-edge-";

export function edgeDispatchName(job: Pick<EdgeSchedulerJob, "id">, suffix: string): string {
  return `${EDGE_JOB_PREFIX}${job.id}${suffix ? "-" + suffix : ""}`;
}

/** One dashboard row per logical job: Vercel HTTP jobs + Edge jobs (shards collapse to their shared ops job). */
export const HEALTH_JOBS: ReadonlyArray<Pick<SchedulerJob, "id" | "label" | "opsJob" | "critical" | "everyMinutes">> = [
  ...SCHEDULER_JOBS,
  ...EDGE_SCHEDULER_JOBS.map((j) => ({ id: j.id, label: j.label, opsJob: j.opsJob, critical: j.critical, everyMinutes: j.everyMinutes })),
];

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
  // Moved to Supabase Edge Functions (migration 090): the Vercel HTTP dispatches are unscheduled.
  "fetch-news",
  "cluster",
  "editorial-generate",
  "translation-backfill",
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
    edgeJobs?: readonly EdgeSchedulerJob[];
  } = {}
): string {
  const disabled = opts.disabled ?? DISABLED_SCHEDULER_JOBS;
  const retiredIds = opts.retiredIds ?? RETIRED_SCHEDULER_JOB_IDS;
  const maintenance = opts.maintenance ?? DB_MAINTENANCE_JOBS;
  const edge = opts.edgeJobs ?? EDGE_SCHEDULER_JOBS;
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
  for (const job of edge) {
    for (const d of job.dispatches) {
      const name = edgeDispatchName(job, d.suffix);
      const lease = d.leaseKey === null ? "null" : `'${d.leaseKey}'`;
      const body = JSON.stringify(d.body).replace(/'/g, "''");
      unschedule(name);
      lines.push(
        `select cron.schedule('${name}', '${d.cron}', $job$ select public.jd_invoke_edge('${job.id}', '${job.function}', '${body}'::jsonb, ${job.timeoutMs}, ${lease}); $job$);`
      );
    }
  }
  for (const job of maintenance) {
    const name = schedulerJobName(job.id);
    unschedule(name);
    lines.push(`select cron.schedule('${name}', '${job.cron}', $job$ ${job.sql} $job$);`);
  }
  return lines.join("\n");
}
