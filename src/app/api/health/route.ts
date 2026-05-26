/**
 * GET /api/health — enterprise platform health (public, cacheable)
 */

import { NextResponse } from "next/server";
import { edgeCacheHeaders } from "@/lib/infrastructure/cache/edge";
import { getProductionEnvChecks } from "@/lib/infrastructure/production";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { isSentryEnabled } from "@/lib/observability/sentry";
import {
  aggregateHealthStatus,
  runAllHealthChecks,
} from "@/lib/observability/health/checks";
import { computeStabilityScore } from "@/lib/observability/stability-score";
import { getMetricsDashboard } from "@/lib/observability/metrics";
import { REQUEST_ID_HEADER, generateRequestId } from "@/lib/observability/request-id";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
  const started = Date.now();

  const [checks, metrics] = await Promise.all([
    runAllHealthChecks(),
    getMetricsDashboard(),
  ]);

  const status = aggregateHealthStatus(checks);
  const productionEnv = getProductionEnvChecks();
  const stability = await computeStabilityScore({
    checks,
    apiSamples: metrics.api,
  });

  const healthy = status === "healthy" || status === "degraded";

  return NextResponse.json(
    {
      ok: healthy,
      service: "jan-darpan-os",
      requestId,
      timestamp: new Date().toISOString(),
      status,
      durationMs: Date.now() - started,
      stability,
      deployment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        productionEnvReady: productionEnv.ready,
        productionWarnings: productionEnv.warnings,
      },
      infrastructure: {
        redis: isRedisConfigured(),
        sentry: isSentryEnabled(),
        homepageCacheSeconds: INFRA_CONFIG.homepageCacheSeconds,
        dashboardCacheTtlSec: INFRA_CONFIG.dashboardCacheTtlSec,
        intelligenceCacheTtlSec: INFRA_CONFIG.intelligenceCacheTtlSec,
      },
      checks: checks.map((c) => ({
        id: c.id,
        label: c.label,
        status: c.status,
        latencyMs: c.latencyMs,
        message: c.message,
      })),
      metrics: {
        memoryUsageMb: metrics.memoryUsageMb,
        uptimeSec: metrics.uptimeSec,
        queueSnapshot: metrics.queues,
      },
    },
    {
      status: status === "unhealthy" ? 503 : 200,
      headers: {
        ...edgeCacheHeaders({ sMaxAge: 15, private: true }),
        [REQUEST_ID_HEADER]: requestId,
      },
    }
  );
}
