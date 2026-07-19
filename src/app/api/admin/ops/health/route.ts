/**
 * GET /api/admin/ops/health — detailed ops health for admin dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import {
  runAllHealthChecks,
  aggregateHealthStatus,
  getCronMonitorState,
  getMetricsDashboard,
  getOpsErrorSummary,
  computeStabilityScore,
  getRecentOpsErrors,
  getQueueAnalyticsDashboard,
  getOpenAiUsageDashboard,
  getAiFinancialDashboard,
} from "@/lib/observability";
import { DASHBOARD_CACHE_META } from "@/lib/infrastructure/cache/dashboard";
import { ANALYTICS_CACHE_TTL_SEC } from "@/lib/infrastructure/cache";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { isSentryEnabled, sentryReadyState } from "@/lib/observability/sentry";
import { getProductionEnvChecks } from "@/lib/infrastructure/production";
import { getLaunchHealthWidgets } from "@/lib/ops/launch-health";
import { getBuildInfo } from "@/lib/observability/build-info";
import { deriveCanonicalHealth } from "@/lib/admin-v3/canonical-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  const wall = Date.now();
  const [checks, metrics, cron, errors, errorList, queueAnalytics, openAiUsage, aiFinancial, launchWidgets] =
    await Promise.all([
    runAllHealthChecks(),
    getMetricsDashboard(),
    getCronMonitorState(),
    getOpsErrorSummary(),
    getRecentOpsErrors(25),
    getQueueAnalyticsDashboard(),
    getOpenAiUsageDashboard(),
    getAiFinancialDashboard(),
    getLaunchHealthWidgets(),
  ]);

  const status = aggregateHealthStatus(checks);
  const score = await computeStabilityScore({ checks, apiSamples: metrics.api });
  const timestamp = new Date().toISOString();

  // Canonical overall state — must not contradict summary surfaces.
  const snapshot = deriveCanonicalHealth({
    ok: status !== "unhealthy",
    status,
    stability: score,
    checks,
    cron,
    launchWidgets,
    timestamp,
  });

  console.info("[ops-health]", {
    totalMs: Date.now() - wall,
    canonicalState: snapshot.state,
    aggregateStatus: status,
  });

  return NextResponse.json({
    ok: status !== "unhealthy",
    status,
    /** Prefer this for overall state — same model as header / summary. */
    snapshot,
    stability: score,
    checks,
    metrics,
    queueAnalytics,
    openAiUsage,
    aiFinancial,
    cron,
    errors,
    recentErrors: errorList,
    caching: {
      redis: isRedisConfigured(),
      dashboard: DASHBOARD_CACHE_META,
      intelligenceTtlSec: Number(process.env.INTELLIGENCE_CACHE_TTL_SEC) || 60,
      analyticsTtlSec: ANALYTICS_CACHE_TTL_SEC,
    },
    observability: {
      sentry: isSentryEnabled(),
      sentryReady: sentryReadyState(),
    },
    production: getProductionEnvChecks(),
    launchWidgets,
    build: getBuildInfo(),
    timestamp,
    mode: "diagnostics",
    timing: { totalMs: Date.now() - wall },
  });
}
