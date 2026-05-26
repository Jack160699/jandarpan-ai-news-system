/**
 * GET /api/editorial/dashboard — realtime editorial control snapshot
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { fetchEditorialDashboard } from "@/lib/editorial-dashboard/fetch-dashboard";
import { edgeCacheHeaders } from "@/lib/infrastructure/cache/edge";
import {
  getCachedDashboard,
  setCachedDashboard,
} from "@/lib/infrastructure/cache/dashboard";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { createCookieServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createCookieServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const cookieHeader = request.headers.get("cookie");
  console.log("[EDITORIAL_DASHBOARD_AUTH]", {
    hasCookies: Boolean(cookieHeader && cookieHeader.length > 0),
    userResolved: Boolean(user?.id),
    authError: authError?.message ?? null,
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const auth = await requireEditorialAuth(request, "content:read");
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.membership.tenantId;
  let snapshot = await getCachedDashboard<Awaited<ReturnType<typeof fetchEditorialDashboard>>>(
    tenantId,
    "editorial"
  );
  const cached = !!snapshot;
  if (!snapshot) {
    snapshot = await fetchEditorialDashboard();
    if (snapshot) {
      await setCachedDashboard(tenantId, "editorial", snapshot);
    }
  }

  if (!snapshot) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: true, ...snapshot, _cache: { hit: cached } },
    {
      headers: edgeCacheHeaders({
        sMaxAge: INFRA_CONFIG.dashboardCacheTtlSec,
        staleWhileRevalidate: INFRA_CONFIG.dashboardCacheTtlSec * 2,
        private: true,
      }),
    }
  );
}
