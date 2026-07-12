/**
 * GET /api/admin/system — system validation dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { loadSystemDashboard } from "@/lib/system-validation/engine";
import { isSystemValidationEnabled } from "@/lib/system-validation/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  if (!isSystemValidationEnabled()) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      dashboard: await loadSystemDashboard(),
      timestamp: new Date().toISOString(),
    });
  }

  const dashboard = await loadSystemDashboard();

  return NextResponse.json({
    ok: dashboard.deploymentStatus !== "blocked",
    enabled: true,
    dashboard,
    timestamp: new Date().toISOString(),
  });
}
