/**
 * GET /api/admin/seo/competitors — competitor intelligence dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import {
  getCompetitorDashboardStats,
  listAllCompetitorSources,
} from "@/lib/competitor-intelligence/repository";
import { isCompetitorTrackerEnabled } from "@/lib/competitor-intelligence/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const [stats, sources] = await Promise.all([
    getCompetitorDashboardStats(),
    listAllCompetitorSources(),
  ]);

  return NextResponse.json({
    ok: true,
    enabled: isCompetitorTrackerEnabled(),
    stats,
    sources,
    timestamp: new Date().toISOString(),
  });
}
