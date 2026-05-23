import { NextResponse } from "next/server";
import { buildNewsroomAnalyticsReport } from "@/lib/analytics/aggregate";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { getTenantConfig } from "@/lib/tenant/resolve";

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

  const tenant = await getTenantConfig();
  const report = await buildNewsroomAnalyticsReport(tenant.id, hours);

  return NextResponse.json({ ok: true, report });
}
