/**
 * GET /api/admin/ops/executive — Executive AI CFO Dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { getExecutiveDashboard } from "@/lib/observability/executive-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  const dashboard = await getExecutiveDashboard();

  return NextResponse.json({
    ok: true,
    dashboard,
    timestamp: dashboard.generatedAt,
  });
}
