/**
 * GET /api/admin/ops/executive — Executive AI CFO Dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { getExecutiveDashboard } from "@/lib/observability/executive-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Financial / AI spend — billing permission required (not monitoring alone).
  const auth = await requireEditorialAuth(request, "billing:read");
  if (!auth.ok) return auth.response;

  try {
    const dashboard = await getExecutiveDashboard();
    return NextResponse.json({
      ok: true,
      dashboard,
      timestamp: dashboard.generatedAt,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "executive_unavailable" },
      { status: 503 }
    );
  }
}
