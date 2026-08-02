/**
 * GET /api/admin/reports/daily/export?date=YYYY-MM-DD&format=csv|json
 * Downloads one daily_newsroom_reports row (default: most recent) plus its
 * metrics/findings/actions as an attachment. Response headers mirror
 * /api/analytics/export's Content-Disposition pattern. Serialization is
 * bespoke (EnterpriseAnalyticsReport's reportToCsv/reportToJson shape in
 * src/lib/analytics/export-report.ts doesn't fit this report's structure)
 * but follows that file's code style (lines array + escapeCsv helper).
 */

import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { fetchReportBundle, resolveLatestReportDate, isValidDateParam, type ReportBundle } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function bundleToCsv(bundle: ReportBundle): string {
  const { report, metrics, findings, actions } = bundle;
  const lines: string[] = [
    `# Jan Darpan Daily Newsroom Audit Report`,
    `# Report date: ${report.report_date}`,
    `# Status: ${report.status} · AI status: ${report.ai_status ?? "n/a"}`,
    `# Generated: ${report.generated_at}`,
    "",
    "## Metrics",
    "category,metric_key,metric_value,unit",
    ...metrics.map((m) =>
      [escapeCsv(m.category), escapeCsv(m.metric_key), escapeCsv(JSON.stringify(m.metric_value)), escapeCsv(m.unit ?? "")].join(
        ","
      )
    ),
    "",
    "## Findings",
    "severity,category,title,observed_fact,ai_interpretation,confidence,source",
    ...findings.map((f) =>
      [
        escapeCsv(f.severity),
        escapeCsv(f.category),
        escapeCsv(f.title),
        escapeCsv(f.observed_fact ?? ""),
        escapeCsv(f.ai_interpretation ?? ""),
        escapeCsv(f.confidence ?? ""),
        escapeCsv(f.source),
      ].join(",")
    ),
    "",
    "## Actions",
    "action,expected_impact,owner_subsystem,urgency,automation_eligible,status",
    ...actions.map((a) =>
      [
        escapeCsv(a.action),
        escapeCsv(a.expected_impact ?? ""),
        escapeCsv(a.owner_subsystem ?? ""),
        escapeCsv(a.urgency ?? ""),
        a.automation_eligible ? "true" : "false",
        escapeCsv(a.status),
      ].join(",")
    ),
  ];
  return lines.join("\n");
}

function bundleToJson(bundle: ReportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "monitoring:read");
  if (!guard.ok) return guard.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const supabase = createAdminServerClient();

  try {
    const reportDate = isValidDateParam(dateParam) ? dateParam : await resolveLatestReportDate(supabase);
    if (!reportDate) {
      return NextResponse.json({ ok: false, error: "no_reports_found" }, { status: 404 });
    }

    const bundle = await fetchReportBundle(supabase, reportDate);
    if (!bundle) {
      return NextResponse.json({ ok: false, error: "report_not_found", reportDate }, { status: 404 });
    }

    const content = format === "json" ? bundleToJson(bundle) : bundleToCsv(bundle);
    const filename = `jan-darpan-newsroom-audit-${reportDate}.${format}`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": format === "json" ? "application/json" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "daily_report_export_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
