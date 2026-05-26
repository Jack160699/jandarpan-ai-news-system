import { NextResponse } from "next/server";
import { buildNewsroomAnalyticsReport } from "@/lib/analytics/aggregate";
import { buildEnterpriseAnalyticsReport } from "@/lib/analytics/enterprise-aggregate";
import {
  getCachedAnalyticsReport,
  setCachedAnalyticsReport,
} from "@/lib/infrastructure/cache/analytics";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { edgeCacheHeaders } from "@/lib/infrastructure/cache/edge";

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
  const enterprise = url.searchParams.get("enterprise") === "1";

  const tenantId = guard.session.membership.tenantId;

  const cached = await getCachedAnalyticsReport(tenantId, hours, enterprise);
  if (cached) {
    return NextResponse.json(
      { ok: true, report: cached, cached: true },
      { headers: edgeCacheHeaders({ sMaxAge: 30, private: true }) }
    );
  }

  const report = enterprise
    ? await buildEnterpriseAnalyticsReport(tenantId, hours)
    : await buildNewsroomAnalyticsReport(tenantId, hours);

  await setCachedAnalyticsReport(tenantId, hours, enterprise, report);

  return NextResponse.json(
    { ok: true, report, cached: false },
    { headers: edgeCacheHeaders({ sMaxAge: 30, private: true }) }
  );
}
