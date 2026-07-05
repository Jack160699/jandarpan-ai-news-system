/**
 * Scheduled cron job identifiers — single source of truth for health monitoring.
 *
 * Keep in sync with:
 * - scripts/setup-qstash-schedules.mjs (QStash destinations)
 * - vercel.json (daily backup crons)
 *
 * Job ids are normalized worker/route names, never URL paths.
 */

export const REGISTERED_CRON_JOBS = [
  "fetch-news",
  "editorial_generate",
  "ai_enrich",
  "editorial_images",
  "job_processor",
  "intelligence_embed",
  "intelligence_snapshot",
  "analytics_aggregate",
] as const;

export type RegisteredCronJobId = (typeof REGISTERED_CRON_JOBS)[number];

export function isRegisteredCronJob(job: string): job is RegisteredCronJobId {
  return (REGISTERED_CRON_JOBS as readonly string[]).includes(job);
}
