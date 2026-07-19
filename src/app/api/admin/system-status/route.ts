/**
 * GET /api/admin/system-status — lightweight canonical health for header/bell.
 * Shares derivation with Platform Health via deriveCanonicalHealth.
 */

import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import {
  runAllHealthChecks,
  aggregateHealthStatus,
  getCronMonitorState,
  computeStabilityScore,
  getMetricsDashboard,
} from "@/lib/observability";
import { getLaunchHealthWidgets } from "@/lib/ops/launch-health";
import { deriveCanonicalHealth } from "@/lib/admin-v3/canonical-health";

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    const [checks, cron, metrics, launchWidgets] = await Promise.all([
      runAllHealthChecks(),
      getCronMonitorState(),
      getMetricsDashboard(),
      getLaunchHealthWidgets(),
    ]);
    clearTimeout(timeout);

    const status = aggregateHealthStatus(checks);
    const stability = await computeStabilityScore({
      checks,
      apiSamples: metrics.api,
    });

    const snapshot = deriveCanonicalHealth({
      ok: status !== "unhealthy",
      status,
      stability,
      checks,
      cron,
      launchWidgets,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      snapshot,
      limited: false,
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
