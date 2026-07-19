/**
 * GET /api/status/production — public production reachability + canonical state for login.
 * Returns only { reachable, state, label } — no secrets or operational detail.
 */

import { NextResponse } from "next/server";
import { edgeCacheHeaders } from "@/lib/infrastructure/cache/edge";
import {
  aggregateHealthStatus,
  runAllHealthChecks,
} from "@/lib/observability/health/checks";
import { getCronMonitorState } from "@/lib/observability/cron-monitor";
import {
  deriveCanonicalHealth,
  loginStatusFromCanonical,
  type CanonicalHealthState,
} from "@/lib/admin-v3/canonical-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [checks, cron] = await Promise.all([
      runAllHealthChecks(),
      getCronMonitorState(),
    ]);

    const status = aggregateHealthStatus(checks);
    const snapshot = deriveCanonicalHealth({
      ok: status !== "unhealthy",
      status,
      checks,
      cron,
      launchWidgets: [],
      timestamp: new Date().toISOString(),
    });

    const state = snapshot.state as CanonicalHealthState;
    const label = loginStatusFromCanonical(state, true);

    return NextResponse.json(
      {
        reachable: true,
        state,
        label,
      },
      {
        status: 200,
        headers: edgeCacheHeaders({ sMaxAge: 15, private: true }),
      }
    );
  } catch {
    return NextResponse.json(
      {
        reachable: true,
        state: "unknown" as const,
        label: "Production reachable",
      },
      {
        status: 200,
        headers: edgeCacheHeaders({ sMaxAge: 10, private: true }),
      }
    );
  }
}
