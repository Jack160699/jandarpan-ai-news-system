/**

 * Scheduled cron job identifiers — single source of truth for health monitoring.

 *

 * Keep in sync with:

 * - scripts/setup-qstash-schedules.mjs (QStash destinations)

 * - docs/QSTASH_SCHEDULER_SETUP.md

 * Canonical translation: publish → worker_jobs (translate_article) → job_processor.
 * `translation-backfill` QStash schedule enqueues gaps; Vercel daily cron is backup drain.

 *

 * Job ids are normalized worker/route names, never URL paths.

 *

 * Intelligence workers (ai_enrich, editorial_images, job_processor, etc.) run

 * inside the scheduled `orchestrate` endpoint — they are not separate cron jobs.

 *

 * Canonical editorial generation: fetch-news → ingest.completed → worker_jobs →

 * job_processor (orchestrate). `editorial_generate` here is the Vercel daily

 * backup worker only — not a QStash schedule.

 */



export const REGISTERED_CRON_JOBS = [

  "fetch-news",

  "orchestrate",

  "editorial_generate",

  "translation-backfill",

  "cleanup",

] as const;



export type RegisteredCronJobId = (typeof REGISTERED_CRON_JOBS)[number];



export function isRegisteredCronJob(job: string): job is RegisteredCronJobId {

  return (REGISTERED_CRON_JOBS as readonly string[]).includes(job);

}


