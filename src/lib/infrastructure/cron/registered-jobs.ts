/**
 * Scheduled cron job identifiers — single source of truth for health monitoring.
 *
 * Keep in sync with:
 * - scripts/setup-qstash-schedules.mjs (QStash destinations)
 * - docs/QSTASH_SCHEDULER_SETUP.md
 * - vercel.json (daily backup crons)
 *
 * Job ids are normalized worker/route names, never URL paths.
 *
 * Intelligence workers (ai_enrich, editorial_images, job_processor, etc.) run
 * inside the scheduled `orchestrate` endpoint — they are not separate cron jobs.
 */

export const REGISTERED_CRON_JOBS = [
  "fetch-news",
  "orchestrate",
  "editorial_generate",
  "data_retention",
  "translation_backfill",
  "workers_health",
] as const;

export type RegisteredCronJobId = (typeof REGISTERED_CRON_JOBS)[number];

export function isRegisteredCronJob(job: string): job is RegisteredCronJobId {
  return (REGISTERED_CRON_JOBS as readonly string[]).includes(job);
}
