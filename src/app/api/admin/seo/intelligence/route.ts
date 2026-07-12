/**
 * GET /api/admin/seo/intelligence — SEO intelligence dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { isSeoIntelligenceEnabled } from "@/lib/seo-intelligence/config";
import { getSeoIntelligenceDashboard } from "@/lib/seo-intelligence/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const dashboard = await getSeoIntelligenceDashboard();

  return NextResponse.json({
    ok: true,
    enabled: isSeoIntelligenceEnabled(),
    dashboard,
    timestamp: new Date().toISOString(),
  });
}
