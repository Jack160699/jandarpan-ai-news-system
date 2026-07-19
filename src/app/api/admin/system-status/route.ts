/**
 * GET /api/admin/system-status — lightweight canonical health for header/bell.
 * Uses the fast health-summary path (no OpenAI usage scans / sitemap / launch widgets).
 */

import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { buildHealthSummary } from "@/lib/admin-v3/health-summary";
import { buildEnvelope } from "@/lib/admin-v3/metric-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireAdminPermission(request, "content:read");
  if (!guard.ok) return guard.response;

  if (!roleHasPermission(guard.session.membership.role, "monitoring:read")) {
    const checkedAt = new Date().toISOString();
    return NextResponse.json({
      ok: true,
      snapshot: {
        state: "unknown",
        label: "Production",
        reasons: [],
        checkedAt,
      },
      limited: true,
      permissions: { monitoring: false },
      contract: buildEnvelope({
        ok: true,
        generatedAt: checkedAt,
        forbidden: true,
      }),
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
      permissions: { monitoring: true },
      timing: {
        totalMs: summary.totalMs,
        sources: summary.sources,
      },
      contract: buildEnvelope({
        ok: true,
        generatedAt: summary.checkedAt,
        stale: summary.stale,
      }),
    });
  } catch {
    const checkedAt = new Date().toISOString();
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
        checkedAt,
      },
      limited: false,
      degraded: true,
      permissions: { monitoring: true },
      contract: buildEnvelope({ ok: false, generatedAt: checkedAt }),
    });
  }
}
