/**
 * GET /api/admin/ops/health-summary — canonical health summary (<1.5s target).
 */

import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { getCanonicalHealth } from "@/lib/admin-v3/canonical-health-service";
import { buildEnvelope } from "@/lib/admin-v3/metric-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireAdminPermission(request, "monitoring:read");
  if (!gate.ok) return gate.response;

  try {
    const summary = await getCanonicalHealth();
    console.info("[health-summary]", {
      totalMs: summary.timing.totalMs,
      cacheHit: summary.fromCache,
      state: summary.snapshot.state,
      failed: summary.failedSources.map((s) => s.source),
    });
    return NextResponse.json({
      ok: summary.ok,
      mode: summary.mode,
      status:
        summary.snapshot.state === "critical"
          ? "unhealthy"
          : summary.snapshot.state === "degraded" || summary.snapshot.state === "warning"
            ? "degraded"
            : summary.snapshot.state === "healthy"
              ? "healthy"
              : "unknown",
      snapshot: summary.snapshot,
      checks: summary.checks,
      metrics: summary.metrics,
      cron: summary.cron,
      sources: summary.sources,
      failedSources: summary.failedSources,
      totalMs: summary.totalMs,
      checkedAt: summary.checkedAt,
      stale: summary.stale,
      fromCache: summary.fromCache,
      contract: summary.contract,
      timing: summary.timing,
    });
  } catch (err) {
    console.error("[health-summary] failed", err);
    const checkedAt = new Date().toISOString();
    return NextResponse.json(
      {
        ok: false,
        mode: "summary",
        error: "summary_unavailable",
        checkedAt,
        sources: [],
        failedSources: [{ source: "summary", ok: false, ms: 0, error: "build_failed" }],
        contract: buildEnvelope({ ok: false, generatedAt: checkedAt }),
      },
      { status: 503 }
    );
  }
}
