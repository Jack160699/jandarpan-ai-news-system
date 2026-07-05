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
} from "@/lib/observability";
import { DASHBOARD_CACHE_META } from "@/lib/infrastructure/cache/dashboard";
import { ANALYTICS_CACHE_TTL_SEC } from "@/lib/infrastructure/cache";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { isSentryEnabled, sentryReadyState } from "@/lib/observability/sentry";
import { getProductionEnvChecks } from "@/lib/infrastructure/production";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  const [checks, metrics, cron, errors, errorList, queueAnalytics] = await Promise.all([
    runAllHealthChecks(),
    getMetricsDashboard(),
    getCronMonitorState(),
    getOpsErrorSummary(),
    getRecentOpsErrors(25),
    getQueueAnalyticsDashboard(),
  ]);

  const status = aggregateHealthStatus(checks);
  const score = await computeStabilityScore({ checks, apiSamples: metrics.api });

  return NextResponse.json({
    ok: status !== "unhealthy",
    status,
    stability: score,
    checks,
    metrics,
    queueAnalytics,
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
    timestamp: new Date().toISOString(),
  });
}
