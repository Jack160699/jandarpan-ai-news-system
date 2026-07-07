/**
 * Direct editorial worker gating — prevents duplicate generation alongside the
 * canonical ingest → event bus → worker_jobs → job_processor path.
 */

export type EditorialGenerateTrigger =
  /** QStash / manual cron worker hit (non-Vercel) */
  | "scheduled_cron"
  /** Vercel daily backup cron (x-vercel-cron) */
  | "vercel_backup"
  /** Explicit orchestrate body, dev cycle, or other manual override */
  | "manual_override";

export function isEditorialBackupCronEnabled(): boolean {
  return process.env.EDITORIAL_GENERATE_BACKUP_CRON === "true";
}

export function resolveDirectEditorialGate(
  trigger: EditorialGenerateTrigger = "scheduled_cron"
): { allowed: boolean; reason: string } {
  if (trigger === "manual_override") {
    return { allowed: true, reason: "manual_override" };
  }

  if (trigger === "vercel_backup") {
    return { allowed: true, reason: "vercel_daily_backup" };
  }

  if (trigger === "scheduled_cron" && isEditorialBackupCronEnabled()) {
    return { allowed: true, reason: "backup_cron_env_enabled" };
  }

  if (trigger === "scheduled_cron") {
    return {
      allowed: false,
      reason: "canonical_path_ingest_event_job_processor",
    };
  }

  return { allowed: false, reason: "direct_editorial_disabled" };
}
