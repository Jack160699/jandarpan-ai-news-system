/**
 * Translation backfill processing gate.
 *
 * Step 2: `/api/cron/translation-backfill` is the dedicated HI/EN process lane.
 * Relying solely on job_processor left translate_article starved behind
 * intelligence_snapshot (priority 8) with processed=0 on every cron run.
 */

export type TranslationBackfillTrigger =
  /** QStash / scheduled cron hit (including Vercel crons that do not set vercelCron) */
  | "scheduled_cron"
  /** Vercel cron with x-vercel-cron detected */
  | "vercel_backup"
  /** Explicit forceProcess body or manual recovery */
  | "manual_override"
  /** Dedicated process-only invocation */
  | "dedicated_lane";

export function isTranslationBackfillProcessEnabled(): boolean {
  return process.env.TRANSLATION_BACKFILL_PROCESS === "true";
}

/**
 * When TRANSLATION_BACKFILL_ENQUEUE_ONLY=true, scheduled runs enqueue gaps but
 * do not drain translate_article (legacy behaviour). Default is process.
 */
export function isTranslationBackfillEnqueueOnly(): boolean {
  return process.env.TRANSLATION_BACKFILL_ENQUEUE_ONLY === "true";
}

export function shouldProcessTranslationBackfill(
  trigger: TranslationBackfillTrigger = "scheduled_cron"
): { allowed: boolean; reason: string } {
  if (trigger === "manual_override" || trigger === "dedicated_lane") {
    return { allowed: true, reason: trigger };
  }

  if (isTranslationBackfillEnqueueOnly()) {
    return {
      allowed: false,
      reason: "enqueue_only_env",
    };
  }

  if (trigger === "vercel_backup") {
    return { allowed: true, reason: "vercel_cron_process_lane" };
  }

  if (trigger === "scheduled_cron") {
    // Dedicated translation-backfill schedule — always drain a bounded batch.
    return { allowed: true, reason: "dedicated_translation_backfill_lane" };
  }

  if (isTranslationBackfillProcessEnabled()) {
    return { allowed: true, reason: "backup_process_env_enabled" };
  }

  return { allowed: false, reason: "process_disabled" };
}
