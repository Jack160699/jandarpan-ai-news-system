import { NextResponse } from "next/server";
import { buildEnterpriseAnalyticsReport } from "@/lib/analytics/enterprise-aggregate";
import { reportToCsv, reportToJson } from "@/lib/analytics/export-report";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "analytics:read");
  if (!guard.ok) return guard.response;

  let body: { format?: "csv" | "json"; hours?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const format = body.format === "json" ? "json" : "csv";
  const hours = Math.min(720, Math.max(1, Number(body.hours ?? 168)));
  const tenantId = guard.session.membership.tenantId;

  const report = await buildEnterpriseAnalyticsReport(tenantId, hours);
  const content = format === "json" ? reportToJson(report) : reportToCsv(report);
  const filename = `jan-darpan-analytics-${new Date().toISOString().slice(0, 10)}.${format}`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type":
        format === "json" ? "application/json" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
