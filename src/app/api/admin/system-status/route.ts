/**
 * GET /api/admin/system-status — lightweight canonical health for header/bell.
 * Uses the fast health-summary path (no OpenAI usage scans / sitemap / launch widgets).
 */

import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { buildHealthSummary } from "@/lib/admin-v3/health-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "content:read");
  if (!guard.ok) return guard.response;

  if (!roleHasPermission(guard.session.membership.role, "monitoring:read")) {
    return NextResponse.json({
      ok: true,
      snapshot: {
        state: "unknown",
        label: "Production",
        reasons: [],
        checkedAt: new Date().toISOString(),
      },
      limited: true,
    });
  }

  try {
    const summary = await buildHealthSummary();
    console.info("[system-status]", {
      totalMs: summary.totalMs,
      failed: summary.failedSources.map((s) => s.source),
    });
    return NextResponse.json({
      ok: true,
      snapshot: summary.snapshot,
      limited: false,
      degraded: summary.stale,
      timing: {
        totalMs: summary.totalMs,
        sources: summary.sources,
      },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      snapshot: {
        state: "unknown",
        label: "Production · Unknown",
        reasons: [
          {
            id: "status-timeout",
            severity: "unknown",
            title: "Health probe timed out",
            detail: "Open Platform health for a full diagnostic.",
            href: "/admin/health",
          },
        ],
        checkedAt: new Date().toISOString(),
      },
      limited: false,
      degraded: true,
    });
  }
}
