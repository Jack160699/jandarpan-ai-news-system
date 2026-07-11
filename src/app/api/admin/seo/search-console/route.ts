/**
 * GET /api/admin/seo/search-console — GSC intelligence dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import {
  hasGscCredentialsConfigured,
  isGscEngineEnabled,
} from "@/lib/gsc-intelligence/config";
import { getGscDashboard } from "@/lib/gsc-intelligence/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const dashboard = await getGscDashboard();

  return NextResponse.json({
    ok: true,
    enabled: isGscEngineEnabled(),
    credentialsConfigured: hasGscCredentialsConfigured(),
    dashboard,
    timestamp: new Date().toISOString(),
  });
}
