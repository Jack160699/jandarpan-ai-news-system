/**
 * GET /api/admin/ops/egress — Supabase egress diagnostics: the egress meter (this process), the durable monthly worker counter, the
 * configured thresholds and the governor's current state/decision. Read-only; auth: monitoring:read.
 *
 * Makes NO Supabase request: it reads Redis (and only when the governor is on) and process memory, so it is safe to open while the
 * project is restricted.
 */

import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { getEgressGovernorSnapshot } from "@/lib/observability/egress-governor";
import { egressMeterEnabled } from "@/lib/observability/egress-meter";
import { isRecurringTrafficPaused } from "@/lib/infrastructure/recurring-pause";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminPermission(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  const snapshot = await getEgressGovernorSnapshot();
  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      meterEnabled: egressMeterEnabled(),
      recurringTrafficPaused: isRecurringTrafficPaused(),
      intelligenceSnapshotEnabled: process.env.INTELLIGENCE_SNAPSHOT_ENABLED === "true",
      ...snapshot,
    },
    { headers: noStoreHeaders() }
  );
}
