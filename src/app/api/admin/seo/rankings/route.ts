/**
 * GET /api/admin/seo/rankings — SERP rankings dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { isSerpTrackerEnabled, hasSerpProviderConfigured } from "@/lib/serp-intelligence/config";
import { getSerpQuotaStatus } from "@/lib/serp-intelligence/quota-manager";
import { getSerpRankingsDashboard } from "@/lib/serp-intelligence/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const [dashboard, quota] = await Promise.all([
    getSerpRankingsDashboard(),
    getSerpQuotaStatus(),
  ]);

  return NextResponse.json({
    ok: true,
    enabled: isSerpTrackerEnabled(),
    providerConfigured: hasSerpProviderConfigured(),
    dashboard: { ...dashboard, quota },
    quota,
    timestamp: new Date().toISOString(),
  });
}
