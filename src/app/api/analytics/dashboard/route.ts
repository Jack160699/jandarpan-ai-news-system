import { NextResponse } from "next/server";
import { buildNewsroomAnalyticsReport } from "@/lib/analytics/aggregate";
import { buildEnterpriseAnalyticsReport } from "@/lib/analytics/enterprise-aggregate";
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
  const enterprise = url.searchParams.get("enterprise") === "1";

  const tenantId = guard.session.membership.tenantId;

  if (enterprise) {
    const report = await buildEnterpriseAnalyticsReport(tenantId, hours);
    return NextResponse.json({ ok: true, report });
  }

  const report = await buildNewsroomAnalyticsReport(tenantId, hours);
  return NextResponse.json({ ok: true, report });
}
