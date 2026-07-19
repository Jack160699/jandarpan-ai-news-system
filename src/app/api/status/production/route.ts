/**
 * GET /api/status/production — public production reachability + canonical state.
 * Uses the same light canonical health service as the admin shell (not heavy diagnostics).
 */

import { NextResponse } from "next/server";
import { edgeCacheHeaders } from "@/lib/infrastructure/cache/edge";
import {
  loginStatusFromCanonical,
  type CanonicalHealthState,
} from "@/lib/admin-v3/canonical-health";
import { getCanonicalHealth } from "@/lib/admin-v3/canonical-health-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await getCanonicalHealth();
    const state = health.snapshot.state as CanonicalHealthState;
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
