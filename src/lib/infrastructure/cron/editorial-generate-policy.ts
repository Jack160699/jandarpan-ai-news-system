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
  | "manual_override"
  /** Phase 2 dedicated /api/cron/editorial-generate lane */
  | "dedicated_lane";

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

  if (trigger === "dedicated_lane") {
    return { allowed: true, reason: "dedicated_lane" };
  }

  if (trigger === "scheduled_cron") {
    return {
      allowed: false,
      reason: "use_dedicated_editorial_generate_cron",
    };
  }

  return { allowed: false, reason: "direct_editorial_disabled" };
}
