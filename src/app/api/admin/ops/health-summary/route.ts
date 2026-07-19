/**
 * GET /api/admin/ops/health-summary — fast owner/health shell payload (<1.5s target).
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { buildHealthSummary } from "@/lib/admin-v3/health-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireEditorialAuth(request, "monitoring:read");
  if (!gate.ok) return gate.response;

  try {
    const summary = await buildHealthSummary();
    console.info("[health-summary]", {
      totalMs: summary.totalMs,
      failed: summary.failedSources.map((s) => s.source),
      sources: summary.sources,
    });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[health-summary] failed", err);
    return NextResponse.json(
      {
        ok: false,
        mode: "summary",
        error: "summary_unavailable",
        checkedAt: new Date().toISOString(),
        sources: [],
        failedSources: [{ source: "summary", ok: false, ms: 0, error: "build_failed" }],
      },
      { status: 503 }
    );
  }
}
