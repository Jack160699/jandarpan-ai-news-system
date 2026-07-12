/**
 * Self-healing — safe recovery actions when validation finds issues
 */

import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { reloadPostgrestSchema } from "@/lib/supabase/reload-schema";
import { getCronMonitorState } from "@/lib/observability/cron-monitor";
import { buildMainSitemap } from "@/lib/seo/sitemap-data";
import { VALIDATION_SELF_HEAL } from "@/lib/system-validation/config";
import { logValidation } from "@/lib/system-validation/logger";
import type { RecoveryAction, ValidationModuleResult } from "@/lib/system-validation/types";

export type RecoveryAttempt = Omit<RecoveryAction, "id" | "createdAt"> & {
  metadata?: Record<string, unknown>;
};

export async function runSelfHealing(
  modules: ValidationModuleResult[],
  runId?: string
): Promise<RecoveryAttempt[]> {
  if (!VALIDATION_SELF_HEAL) {
    return [
      {
        actionType: "log_only",
        target: null,
        status: "skipped",
        message: "Self-heal disabled",
        metadata: { runId },
      },
    ];
  }

  const actions: RecoveryAttempt[] = [];
  const hasCacheIssue = modules.some(
    (m) => m.moduleId === "homepage_ranking" && m.status !== "pass"
  );
  const hasSitemapIssue = modules.some(
    (m) => m.moduleId === "sitemap" && m.status === "fail"
  );
  const hasSchemaIssue = modules.some(
    (m) => m.moduleId === "db_migrations" && m.status === "fail"
  );
  const hasStaleCron = modules.some(
    (m) => m.moduleId === "cron_health" && m.status === "warn"
  );

  if (hasCacheIssue || modules.some((m) => m.moduleId === "redis" && m.status === "warn")) {
    try {
      await revalidateNewsroomCaches();
      actions.push({
        actionType: "clear_cache",
        target: "homepage+isr",
        status: "succeeded",
        message: "Cleared homepage Redis and revalidated ISR paths",
        metadata: { runId },
      });
    } catch (err) {
      actions.push({
        actionType: "clear_cache",
        target: "homepage+isr",
        status: "failed",
        message: err instanceof Error ? err.message : "cache_clear_failed",
        metadata: { runId },
      });
    }
  }

  if (hasSitemapIssue) {
    try {
      const entries = await buildMainSitemap();
      await revalidateNewsroomCaches();
      actions.push({
        actionType: "regenerate_sitemap",
        target: "/sitemap.xml",
        status: "succeeded",
        message: `Regenerated sitemap (${entries.length} URLs) and revalidated`,
        metadata: { runId, urlCount: entries.length },
      });
    } catch (err) {
      actions.push({
        actionType: "regenerate_sitemap",
        target: "/sitemap.xml",
        status: "failed",
        message: err instanceof Error ? err.message : "sitemap_failed",
        metadata: { runId },
      });
    }
  }

  if (hasSchemaIssue) {
    try {
      const result = await reloadPostgrestSchema();
      actions.push({
        actionType: "reload_schema",
        target: "postgrest",
        status: result.ok ? "succeeded" : "failed",
        message: result.ok ? "PostgREST schema reloaded" : result.error ?? "reload_failed",
        metadata: { runId },
      });
    } catch (err) {
      actions.push({
        actionType: "reload_schema",
        target: "postgrest",
        status: "failed",
        message: err instanceof Error ? err.message : "reload_failed",
        metadata: { runId },
      });
    }
  }

  if (hasStaleCron) {
    try {
      const cron = await getCronMonitorState();
      const secret = process.env.CRON_SECRET?.trim();
      if (!secret) {
        actions.push({
          actionType: "retry_cron",
          target: cron.staleJobs[0] ?? "unknown",
          status: "skipped",
          message: "CRON_SECRET not available for retry",
          metadata: { staleJobs: cron.staleJobs },
        });
      } else {
        actions.push({
          actionType: "retry_cron",
          target: cron.staleJobs.join(","),
          status: "skipped",
          message: "Stale cron logged — trigger manually via Vercel/QStash dashboard",
          metadata: { staleJobs: cron.staleJobs, runId },
        });
        logValidation("stale_cron_detected", { jobs: cron.staleJobs });
      }
    } catch {
      /* skip */
    }
  }

  if (actions.length === 0) {
    actions.push({
      actionType: "log_only",
      target: null,
      status: "succeeded",
      message: "No recovery actions required",
      metadata: { runId },
    });
  }

  return actions;
}
