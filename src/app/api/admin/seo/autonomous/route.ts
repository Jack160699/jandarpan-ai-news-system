/**
 * GET /api/admin/seo/autonomous — autonomous SEO dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { getAutonomousDashboard } from "@/lib/seo-autonomous/repository";
import { isAutonomousSeoEnabled } from "@/lib/seo-autonomous/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const dashboard = await getAutonomousDashboard();

  return NextResponse.json({
    ok: true,
    enabled: isAutonomousSeoEnabled(),
    dashboard,
    timestamp: new Date().toISOString(),
  });
}
