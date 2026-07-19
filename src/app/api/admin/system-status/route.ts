/**
 * GET /api/admin/system-status — canonical health for header/status sheet.
 */

import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { getCanonicalHealth } from "@/lib/admin-v3/canonical-health-service";
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
        generatedAt: checkedAt,
        lastSuccessfulAt: null,
        freshness: "unavailable",
        usedLastKnown: false,
        partialSources: [],
        sourceStatuses: [],
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

  const summary = await getCanonicalHealth();
  console.info("[system-status]", {
    totalMs: summary.timing.totalMs,
    cacheHit: summary.fromCache,
    state: summary.snapshot.state,
    usedLastKnown: summary.snapshot.usedLastKnown,
  });

  return NextResponse.json({
    ok: true,
    snapshot: summary.snapshot,
    limited: false,
    degraded: summary.stale,
    permissions: { monitoring: true },
    timing: summary.timing,
    fromCache: summary.fromCache,
    contract: summary.contract,
  });
}
