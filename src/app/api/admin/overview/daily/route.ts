/**
 * GET /api/admin/overview/daily — permission-sectioned owner daily briefing.
 */

import { NextResponse } from "next/server";
import {
  requireAnyAdminPermission,
  sessionHasAnyPermission,
} from "@/lib/auth/admin-authorization";
import { buildOverviewDailyPayload } from "@/lib/admin-v3/overview-daily";
import { DAILY_ENDPOINT_PERMISSIONS } from "@/lib/admin-v3/overview-daily-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(
    request,
    DAILY_ENDPOINT_PERMISSIONS
  );
  if (!auth.ok) return auth.response;

  // Defense in depth — section builder also gates fetches
  if (!sessionHasAnyPermission(auth.session, DAILY_ENDPOINT_PERMISSIONS)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const payload = await buildOverviewDailyPayload({
    role: auth.session.membership.role,
    requestUrl: request.url,
    cookieHeader: request.headers.get("cookie"),
  });

  console.info("[overview-daily]", {
    totalMs: payload.totalMs,
    role: auth.session.membership.role,
    granted: (payload.permissions as { granted: string[] })?.granted,
    failed: ((payload.sources as Array<{ ok: boolean; source: string }>) ?? [])
      .filter((s) => !s.ok)
      .map((s) => s.source),
  });

  return NextResponse.json(payload);
}
