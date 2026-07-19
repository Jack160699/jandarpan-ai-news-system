/**
 * Retired cron / worker heartbeat ids — must never re-enter REGISTERED_CRON_JOBS.
 * After Phase 2, generation is `editorial-generate` (kebab), not `editorial_generate`.
 */

export const RETIRED_CRON_JOBS = [
  "editorial_generate",
  "cluster",
  "revalidate",
] as const;

export type RetiredCronJobId = (typeof RETIRED_CRON_JOBS)[number];

export function isRetiredCronJob(job: string): boolean {
  return (RETIRED_CRON_JOBS as readonly string[]).includes(job);
}

/**
 * Per-job stale thresholds (ms). Jobs slower than the default 24h SLA still
 * alarm, but infrequent schedules get a wider window to avoid false stale.
 */
export const CRON_STALE_THRESHOLD_BY_JOB_MS: Record<string, number> = {
  // Every 30 minutes — allow two missed ticks + buffer
  "competitor-tracker": 2 * 60 * 60 * 1000,
  "seo-intelligence": 2 * 60 * 60 * 1000,
  // Twice daily
  "serp-tracker": 18 * 60 * 60 * 1000,
  "gsc-intelligence": 36 * 60 * 60 * 1000,
  // Every 6h
  "seo-autonomous": 12 * 60 * 60 * 1000,
  "translation-backfill": 18 * 60 * 60 * 1000,
  // Daily
  cleanup: 36 * 60 * 60 * 1000,
  // Hourly health
  "workers-health": 3 * 60 * 60 * 1000,
};

export function staleThresholdForJob(job: string, defaultMs: number): number {
  return CRON_STALE_THRESHOLD_BY_JOB_MS[job] ?? defaultMs;
}
