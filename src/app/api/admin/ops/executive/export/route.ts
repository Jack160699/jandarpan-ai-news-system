/**
 * POST /api/admin/ops/executive/export — Export executive CFO reports
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { getExecutiveDashboard } from "@/lib/observability/executive-dashboard";
import { createAdminServerClient } from "@/lib/supabase";
import { asJsonObject } from "@/types/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportBody = {
  format?: "csv" | "json" | "pdf";
  period?: "daily" | "weekly" | "monthly" | "quarterly";
};

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "billing:read");
  if (!auth.ok) return auth.response;

  let body: ExportBody = {};
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    body = {};
  }

  const format = body.format ?? "json";
  const period = body.period ?? "daily";
  const dashboard = await getExecutiveDashboard();

  try {
    const supabase = createAdminServerClient();
    await supabase.from("executive_report_snapshots").insert({
      period,
      format,
      payload: asJsonObject(dashboard as unknown as Record<string, unknown>),
      exchange_rate: dashboard.exchangeRate,
    });
  } catch {
    // Table may not exist yet — export still works
  }

  if (format === "json") {
    return NextResponse.json({
      ok: true,
      period,
      generatedAt: dashboard.generatedAt,
      dashboard,
    });
  }

  if (format === "csv") {
    const rows = [
      ["Metric", "USD", "INR"],
      ["Today Spend", dashboard.overview.todaySpend.usdLabel, dashboard.overview.todaySpend.inrLabel],
      ["Monthly Spend", dashboard.overview.monthlySpend.usdLabel, dashboard.overview.monthlySpend.inrLabel],
      ["Budget Remaining", dashboard.overview.budgetRemaining.usdLabel, dashboard.overview.budgetRemaining.inrLabel],
      ["Money Saved", dashboard.overview.moneySaved.usdLabel, dashboard.overview.moneySaved.inrLabel],
      ["Efficiency Score", String(dashboard.efficiencyScore.overall), ""],
      ["Queue Size", String(dashboard.businessKpis.queueSize), ""],
      ["Published Today", String(dashboard.businessKpis.publishedToday), ""],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="executive-cfo-${period}.csv"`,
      },
    });
  }

  // PDF stub — structured JSON with pdf content-type for client-side rendering
  const pdfPayload = {
    title: `Executive AI CFO Report — ${period}`,
    generatedAt: dashboard.generatedAt,
    exchangeRate: dashboard.exchangeRate,
    overview: dashboard.overview,
    profitability: dashboard.profitability,
    efficiencyScore: dashboard.efficiencyScore,
    recommendations: dashboard.recommendations.slice(0, 5),
  };

  return NextResponse.json({
    ok: true,
    format: "pdf",
    note: "Structured report payload — use client print or PDF library for rendering.",
    report: pdfPayload,
  });
}
