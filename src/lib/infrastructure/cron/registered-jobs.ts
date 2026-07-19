/**
 * Scheduled cron job identifiers — single source of truth for health monitoring.
 *
 * Keep in sync with:
 * - vercel.json (Vercel Cron paths)
 * - scripts/setup-qstash-schedules.mjs (QStash destinations)
 * - docs/QSTASH_SCHEDULER_SETUP.md
 *
 * Canonical translation: publish → worker_jobs (translate_article) → job_processor.
 * `translation-backfill` QStash schedule enqueues gaps; Vercel daily cron is backup drain.
 *
 * Job ids are normalized worker/route names, never URL paths.
 * (e.g. vercel path `/api/cron/workers/health` → job id `workers-health`)
 *
 * Intelligence workers (ai_enrich, editorial_images, job_processor, etc.) run
 * inside the scheduled `orchestrate` endpoint — they are not separate cron jobs.
 *
 * Retired from this registry (no longer in vercel.json — do not re-add):
 * - `editorial_generate` → replaced by fetch-news → ingest → worker_jobs →
 *   job_processor/orchestrate
 * - `cluster` → retired (not scheduled)
 * - `revalidate` → handled inside orchestrate/cache paths, not a standalone cron
 */

export const REGISTERED_CRON_JOBS = [
  "fetch-news",
  "orchestrate",
  "edition-publish",
  "translation-backfill",
  "cleanup",
  "competitor-tracker",
  "seo-intelligence",
  "serp-tracker",
  "gsc-intelligence",
  "seo-autonomous",
  "workers-health",
] as const;

export type RegisteredCronJobId = (typeof REGISTERED_CRON_JOBS)[number];

export function isRegisteredCronJob(job: string): job is RegisteredCronJobId {
  return (REGISTERED_CRON_JOBS as readonly string[]).includes(job);
}
