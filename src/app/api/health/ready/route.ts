/**
 * GET /api/health/ready — readiness probe (dependencies; cron-auth for detail)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { edgeCacheHeaders } from "@/lib/infrastructure/cache/edge";
import { isDeployedEnvironment } from "@/lib/infrastructure/production";
import {
  aggregateHealthStatus,
  runAllHealthChecks,
} from "@/lib/observability/health/checks";
import {
  generateRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/observability/request-id";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
  const started = Date.now();

  const cronAuth = await verifyCronRequest(request, { capability: "ops" });
  const detailed = cronAuth.authorized || !isDeployedEnvironment();

  if (!detailed) {
    return NextResponse.json(
      {
        ok: true,
        probe: "ready",
        service: "jan-darpan-os",
        status: "ready",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          ...edgeCacheHeaders({ sMaxAge: 10, private: true }),
          [REQUEST_ID_HEADER]: requestId,
        },
      }
    );
  }

  const checks = await runAllHealthChecks();
  const status = aggregateHealthStatus(checks);
  const ready = status === "healthy" || status === "degraded";

  return NextResponse.json(
    {
      ok: ready,
      probe: "ready",
      service: "jan-darpan-os",
      requestId,
      status,
      durationMs: Date.now() - started,
      timestamp: new Date().toISOString(),
      checks: checks.map((c) => ({
        id: c.id,
        status: c.status,
        latencyMs: c.latencyMs,
      })),
    },
    {
      status: ready ? 200 : 503,
      headers: {
        ...edgeCacheHeaders({ sMaxAge: 10, private: true }),
        [REQUEST_ID_HEADER]: requestId,
      },
    }
  );
}
