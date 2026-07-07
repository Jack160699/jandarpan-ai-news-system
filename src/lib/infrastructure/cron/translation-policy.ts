/**
 * Translation backfill processing gate — enqueue scans may run on schedule,
 * but job execution belongs to job_processor (orchestrate) during normal ops.
 */

export type TranslationBackfillTrigger =
  /** QStash / scheduled cron hit (non-Vercel) */
  | "scheduled_cron"
  /** Vercel daily backup cron (x-vercel-cron) */
  | "vercel_backup"
  /** Explicit forceProcess body or manual recovery */
  | "manual_override";

export function isTranslationBackfillProcessEnabled(): boolean {
  return process.env.TRANSLATION_BACKFILL_PROCESS === "true";
}

export function shouldProcessTranslationBackfill(
  trigger: TranslationBackfillTrigger = "scheduled_cron"
): { allowed: boolean; reason: string } {
  if (trigger === "manual_override") {
    return { allowed: true, reason: "manual_override" };
  }

  if (trigger === "vercel_backup") {
    return { allowed: true, reason: "vercel_daily_backup" };
  }

  if (trigger === "scheduled_cron" && isTranslationBackfillProcessEnabled()) {
    return { allowed: true, reason: "backup_process_env_enabled" };
  }

  if (trigger === "scheduled_cron") {
    return {
      allowed: false,
      reason: "canonical_path_job_processor",
    };
  }

  return { allowed: false, reason: "process_disabled" };
}
