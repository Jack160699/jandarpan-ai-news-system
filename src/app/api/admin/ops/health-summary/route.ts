/**
 * GET /api/admin/ops/health-summary — fast owner/health shell payload (<1.5s target).
 */

import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { buildHealthSummary } from "@/lib/admin-v3/health-summary";
import { buildEnvelope } from "@/lib/admin-v3/metric-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireAdminPermission(request, "monitoring:read");
  if (!gate.ok) return gate.response;

  try {
    const summary = await buildHealthSummary();
    console.info("[health-summary]", {
      totalMs: summary.totalMs,
      failed: summary.failedSources.map((s) => s.source),
      sources: summary.sources,
    });
    return NextResponse.json({
      ...summary,
      contract: buildEnvelope({
        ok: true,
        generatedAt: summary.checkedAt,
        stale: summary.stale,
      }),
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
