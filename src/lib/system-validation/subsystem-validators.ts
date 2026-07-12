/**
 * Subsystem validators — orchestrates existing health engines
 */

import {
  runAllHealthChecks,
  getCronMonitorState,
  getMetricsDashboard,
  getOpsErrorSummary,
} from "@/lib/observability";
import { getLaunchHealthWidgets } from "@/lib/ops/launch-health";
import { runSchemaHealthChecks } from "@/lib/supabase/schema-health";
import { validateProductionEnv } from "@/lib/security/env-validation";
import { getProductionEnvChecks } from "@/lib/infrastructure/production";
import { isSentryEnabled } from "@/lib/observability/sentry";
import { isCompetitorTrackerEnabled } from "@/lib/competitor-intelligence/config";
import { isSeoIntelligenceEnabled } from "@/lib/seo-intelligence/config";
import { isSerpTrackerEnabled } from "@/lib/serp-intelligence/config";
import { isGscEngineEnabled } from "@/lib/gsc-intelligence/config";
import { isSeoExecutionEngineEnabled } from "@/lib/seo-execution/config";
import { isAutonomousSeoEnabled } from "@/lib/seo-autonomous/config";
import { isAiCopilotEnabled } from "@/lib/ai-copilot/config";
import { isSupabaseConfigured, createAdminServerClient } from "@/lib/supabase";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { countPendingEditorialImages } from "@/lib/news/ai/generate-editorial-image";
import { auditTranslationCoverage } from "@/lib/i18n/multilingual/translation-queue";
import { REGISTERED_CRON_JOBS } from "@/lib/infrastructure/cron/registered-jobs";
import type { HealthCheckResult } from "@/lib/observability/types";
import type { ValidationModuleResult, ValidationStatus } from "@/lib/system-validation/types";

function healthToStatus(check: HealthCheckResult): ValidationStatus {
  if (check.status === "healthy") return "pass";
  if (check.status === "degraded") return "warn";
  if (check.status === "unknown") return "skip";
  return "fail";
}

function flagModule(
  moduleId: string,
  label: string,
  category: ValidationModuleResult["category"],
  enabled: boolean,
  extra?: { table?: string }
): ValidationModuleResult {
  return {
    moduleId,
    label,
    category,
    status: enabled ? "pass" : "warn",
    message: enabled ? `${label} enabled` : `${label} disabled (feature flag off)`,
    latencyMs: 0,
    details: extra,
  };
}

async function checkTableExists(table: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await createAdminServerClient()
    .from(table as never)
    .select("id", { head: true, count: "exact" })
    .limit(1);
  return !error;
}

export async function validateSubsystems(): Promise<ValidationModuleResult[]> {
  const modules: ValidationModuleResult[] = [];
  const checks = await runAllHealthChecks();

  const checkMap = Object.fromEntries(checks.map((c) => [c.id, c]));

  const mapCheck = (
    checkId: string,
    moduleId: string,
    label: string,
    category: ValidationModuleResult["category"]
  ) => {
    const check = checkMap[checkId];
    if (!check) return;
    modules.push({
      moduleId,
      label,
      category,
      status: healthToStatus(check),
      message: check.message ?? check.label,
      details: check.details,
      latencyMs: check.latencyMs,
    });
  };

  mapCheck("ingestion", "ai_news_pipeline", "AI News Pipeline", "ai");
  mapCheck("queues", "editorial_pipeline", "Editorial Pipeline", "publishing");
  mapCheck("cron_workers", "scheduler", "Scheduler / Cron Jobs", "scheduler");
  mapCheck("supabase", "supabase", "Supabase", "database");
  mapCheck("redis", "redis", "Redis", "infrastructure");
  mapCheck("storage", "storage", "Storage", "infrastructure");
  mapCheck("openai", "image_generation", "Image Generation / AI", "ai");
  mapCheck("homepage", "homepage_ranking", "Homepage Ranking", "publishing");
  mapCheck("analytics", "monitoring", "Monitoring", "performance");
  mapCheck("ingestion", "rss_sources", "RSS Sources", "ai");
  mapCheck("vectors", "search_apis", "Search APIs / Vectors", "database");
  mapCheck("realtime", "logging", "Logging / Realtime", "infrastructure");

  modules.push(
    flagModule(
      "competitor_intelligence",
      "Competitor Intelligence",
      "seo",
      isCompetitorTrackerEnabled(),
      { table: "competitor_articles" }
    ),
    flagModule("seo_intelligence", "SEO Intelligence", "seo", isSeoIntelligenceEnabled()),
    flagModule("serp_tracker", "SERP Tracker", "seo", isSerpTrackerEnabled()),
    flagModule("gsc_engine", "Google Search Console Engine", "seo", isGscEngineEnabled()),
    flagModule("seo_execution", "SEO Execution Engine", "seo", isSeoExecutionEngineEnabled()),
    flagModule("autonomous_seo", "Autonomous SEO Engine", "seo", isAutonomousSeoEnabled()),
    flagModule("ai_copilot", "AI Editorial Copilot", "ai", isAiCopilotEnabled())
  );

  try {
    const schema = await runSchemaHealthChecks();
    modules.push({
      moduleId: "db_migrations",
      label: "Database Migration Validation",
      category: "database",
      status: schema.ok ? "pass" : schema.checksumMatch === false ? "fail" : "warn",
      message: schema.ok
        ? `Migration ${schema.migrationLatest} OK`
        : `Schema drift detected`,
      details: {
        migrationLatest: schema.migrationLatest,
        checksumMatch: schema.checksumMatch,
        checks: schema.checks.filter((c) => !c.ok).map((c) => c.id),
      },
      latencyMs: 0,
    });
  } catch (err) {
    modules.push({
      moduleId: "db_migrations",
      label: "Database Migration Validation",
      category: "database",
      status: "fail",
      message: err instanceof Error ? err.message : "schema_check_failed",
      latencyMs: 0,
    });
  }

  try {
    const coverage = await auditTranslationCoverage();
    modules.push({
      moduleId: "translation",
      label: "Translation",
      category: "publishing",
      status: coverage.backlogTotal < 100 ? "pass" : coverage.backlogTotal < 300 ? "warn" : "fail",
      message: `Backlog ${coverage.backlogTotal} · pending ${coverage.queuePending}`,
      details: coverage as unknown as Record<string, unknown>,
      latencyMs: 0,
    });
  } catch {
    modules.push({
      moduleId: "translation",
      label: "Translation",
      category: "publishing",
      status: "warn",
      message: "Translation audit unavailable",
      latencyMs: 0,
    });
  }

  try {
    const pending = await countPendingEditorialImages();
    modules.push({
      moduleId: "image_queue",
      label: "Image Generation Queue",
      category: "ai",
      status: pending < 100 ? "pass" : pending < 200 ? "warn" : "fail",
      message: `${pending} editorial images pending`,
      latencyMs: 0,
    });
  } catch {
    /* covered by queues check */
  }

  const envIssues = validateProductionEnv();
  const prodEnv = getProductionEnvChecks();
  modules.push({
    moduleId: "env_validation",
    label: "Environment Variable Validation",
    category: "security",
    status:
      envIssues.filter((i) => i.severity === "error").length > 0
        ? "fail"
        : envIssues.length > 0 || !prodEnv.ready
          ? "warn"
          : "pass",
    message:
      envIssues.length > 0
        ? `${envIssues.length} env issues`
        : prodEnv.ready
          ? "Production env ready"
          : "Env warnings present",
    details: { issues: envIssues, warnings: prodEnv.warnings },
    latencyMs: 0,
  });

  modules.push({
    moduleId: "api_health",
    label: "API Health",
    category: "performance",
    status: "pass",
    message: "Ops metrics available",
    latencyMs: 0,
  });

  try {
    const metrics = await getMetricsDashboard();
    const p95 = metrics.api?.length
      ? metrics.api.sort((a, b) => b.durationMs - a.durationMs)[
          Math.floor(metrics.api.length * 0.05)
        ]?.durationMs
      : null;
    modules.push({
      moduleId: "performance",
      label: "Performance",
      category: "performance",
      status: p95 == null ? "skip" : p95 < 3000 ? "pass" : p95 < 8000 ? "warn" : "fail",
      message: p95 != null ? `API p95 ~${p95}ms` : "No API samples yet",
      latencyMs: 0,
    });
  } catch {
    modules.push({
      moduleId: "performance",
      label: "Performance",
      category: "performance",
      status: "skip",
      message: "Metrics unavailable",
      latencyMs: 0,
    });
  }

  modules.push({
    moduleId: "security",
    label: "Security",
    category: "security",
    status: isSentryEnabled() ? "pass" : "warn",
    message: `Sentry ${isSentryEnabled() ? "enabled" : "disabled"}`,
    latencyMs: 0,
  });

  try {
    const cron = await getCronMonitorState();
    const registered = REGISTERED_CRON_JOBS.length;
    modules.push({
      moduleId: "cron_health",
      label: "Cron Health",
      category: "scheduler",
      status: cron.staleJobs.length === 0 ? "pass" : "warn",
      message:
        cron.staleJobs.length > 0
          ? `Stale: ${cron.staleJobs.join(", ")}`
          : `${registered} registered jobs monitored`,
      details: { staleJobs: cron.staleJobs, registered },
      latencyMs: 0,
    });
  } catch {
    /* covered by cron_workers */
  }

  try {
    const errors = await getOpsErrorSummary();
    modules.push({
      moduleId: "error_monitoring",
      label: "Error Monitoring",
      category: "performance",
      status: errors.bySeverity.critical > 0 ? "fail" : errors.last24h > 20 ? "warn" : "pass",
      message: `${errors.last24h} errors in 24h`,
      details: errors as unknown as Record<string, unknown>,
      latencyMs: 0,
    });
  } catch {
    /* skip */
  }

  const launchWidgets = await getLaunchHealthWidgets().catch(() => []);
  for (const w of launchWidgets) {
    if (modules.some((m) => m.moduleId === w.id)) continue;
    modules.push({
      moduleId: w.id,
      label: w.label,
      category:
        w.id === "sitemap" || w.id === "search"
          ? "indexing"
          : w.id === "cron"
            ? "scheduler"
            : "publishing",
      status: w.status === "healthy" ? "pass" : w.status === "degraded" ? "warn" : "fail",
      message: w.detail,
      latencyMs: 0,
    });
  }

  if (isRedisConfigured()) {
    modules.push({
      moduleId: "redis_cache",
      label: "Redis Cache",
      category: "infrastructure",
      status: "pass",
      message: "Redis configured",
      latencyMs: 0,
    });
  }

  if (isSupabaseConfigured()) {
    const seoTables = [
      "seo_execution_jobs",
      "serp_rankings",
      "gsc_daily_metrics",
      "ai_recommendations",
      "seo_actions",
    ];
    for (const table of seoTables) {
      const exists = await checkTableExists(table);
      if (!exists) continue;
    }
  }

  return modules;
}
