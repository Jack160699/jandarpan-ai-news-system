import { NextResponse } from "next/server";
import { buildEnterpriseAnalyticsReport } from "@/lib/analytics/enterprise-aggregate";
import {
  getCachedAnalyticsReport,
  requestAnalyticsRefresh,
} from "@/lib/analytics/snapshot-cache";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "analytics:read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const hours = Math.min(
    720,
    Math.max(1, Number(url.searchParams.get("hours") ?? 168))
  );

  const tenantId = guard.session.membership.tenantId;
  const cached = await getCachedAnalyticsReport(tenantId, hours);

  if (cached) {
    return NextResponse.json({
      ok: true,
      report: cached,
      _cache: { source: "precomputed" },
    });
  }

  void requestAnalyticsRefresh(tenantId, hours);
  const report = await buildEnterpriseAnalyticsReport(tenantId, hours);

  return NextResponse.json({
    ok: true,
    report,
    _cache: { source: "live", refreshEnqueued: true },
  });
}
