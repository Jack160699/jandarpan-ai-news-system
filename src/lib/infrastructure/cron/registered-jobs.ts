/**
 * Scheduled cron job identifiers — single source of truth for health monitoring.
 *
 * Keep in sync with:
 * - vercel.json (Vercel Cron paths)
 * - scripts/setup-qstash-schedules.mjs (QStash destinations)
 * - docs/QSTASH_SCHEDULER_SETUP.md
 *
 * Canonical translation: publish/schedule → worker_jobs(translate_article)
 * → dedicated `/api/cron/translation-backfill` process lane (also enqueues gaps).
 * job_processor remains a secondary drain.
 *
 * Job ids are normalized worker/route names, never URL paths.
 * (e.g. vercel path `/api/cron/workers/health` → job id `workers-health`)
 *
 * Phase 2: `editorial-generate` is a dedicated cron lane draining
 * worker_jobs(editorial_generate). Orchestrate/job_processor exclude that job type.
 *
 * Retired from this registry (no longer in vercel.json — do not re-add):
 * - `editorial_generate` → worker id alias; scheduled cron is `editorial-generate`
 * - `cluster` → retired (not scheduled)
 * - `revalidate` → handled inside orchestrate/cache paths, not a standalone cron
 */

export const REGISTERED_CRON_JOBS = [
  "fetch-news",
  "orchestrate",
  "editorial-generate",
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
