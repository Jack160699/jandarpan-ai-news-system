/**
 * GET /api/admin/seo/rankings — SERP rankings dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { isSerpTrackerEnabled, hasSerpProviderConfigured } from "@/lib/serp-intelligence/config";
import { getSerpRankingsDashboard } from "@/lib/serp-intelligence/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const dashboard = await getSerpRankingsDashboard();

  return NextResponse.json({
    ok: true,
    enabled: isSerpTrackerEnabled(),
    providerConfigured: hasSerpProviderConfigured(),
    dashboard,
    timestamp: new Date().toISOString(),
  });
}
