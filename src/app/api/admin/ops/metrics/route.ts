/**
 * GET /api/admin/ops/metrics — performance & worker metrics
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { getMetricsDashboard, summarizeApiLatency } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  const metrics = await getMetricsDashboard();
  const apiSummary = summarizeApiLatency(metrics.api);

  return NextResponse.json({
    ok: true,
    metrics,
    apiSummary,
    timestamp: new Date().toISOString(),
  });
}
