import { NextResponse } from "next/server";
import { legacyDashboardApiHeaders } from "@/lib/admin-platform/api-deprecation";
import { fetchSaasDashboard } from "@/lib/dashboard/fetch-snapshot";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "analytics:read");
  if (!guard.ok) return guard.response;

  const snapshot = await fetchSaasDashboard(guard.session);
  if (!snapshot) {
    return NextResponse.json(
      { ok: false, error: "snapshot_unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: true, ...snapshot },
    { headers: legacyDashboardApiHeaders("/api/editorial/dashboard") }
  );
}
