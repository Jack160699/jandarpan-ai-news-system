/**
 * GET /api/admin/reports/daily?date=YYYY-MM-DD
 * Returns one daily_newsroom_reports row (default: most recent) plus its
 * metrics/findings/actions, the last 8 report_date+status+ai_status rows
 * for the history list, and a server-computed today/yesterday/7-day-average
 * comparison (deltas are computed here, server-side, not client-side — see
 * computeComparison below).
 *
 * Catch-up: when viewing the default ("latest") view — no explicit ?date=
 * — and the most-recently-completed IST day (yesterdayIstDay()) has no
 * final report yet, this claims a generation slot
 * (claimReportGenerationIfMissing) and, if it wins the claim, schedules
 * generateDailyReport() via next/server's after() so it runs once the
 * response has been sent — the normal 02:00 IST cron can still be late,
 * fail, or never fire (e.g. before this PR's first Production deploy) and
 * an admin opening the dashboard still gets a report without clicking
 * anything. `catchUp` in the response tells the client whether to show an
 * in-progress state and keep polling.
 */

import { NextResponse, after } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { pipelineWarn } from "@/lib/observability/production-log";
import {
  claimReportGenerationIfMissing,
  generateDailyReport,
  notifyReportGenerationFailure,
  yesterdayIstDay,
  type ReportGenerationClaim,
} from "@/lib/newsroom-audit/generate";
import {
  fetchReportBundle,
  fetchRecentReports,
  resolveLatestReportDate,
  isValidDateParam,
  type HistoryRow,
} from "./_shared";

async function runCatchUpGeneration(reportDate: string): Promise<void> {
  try {
    const result = await generateDailyReport(reportDate);
    if (!result.ok) {
      await notifyReportGenerationFailure(reportDate, result.error);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "newsroom_daily_report_catchup_failed";
    pipelineWarn("[newsroom_audit_catchup_error]", { reportDate, reason: message });
    await notifyReportGenerationFailure(reportDate, message);
  }
}

function catchUpStatusFromClaim(claim: ReportGenerationClaim): "triggered" | "in_progress" | "none" {
  if (claim === "claimed") return "triggered";
  if (claim === "already_in_progress") return "in_progress";
  return "none"; // already_final | error — nothing for the client to wait on
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + delta));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}

function computeComparison(reportDate: string, history: HistoryRow[]) {
  const byDate = new Map(history.map((h) => [h.reportDate, h]));
  const today = byDate.get(reportDate) ?? null;
  const yesterday = byDate.get(shiftDay(reportDate, -1)) ?? null;

  const window7 = history.filter((h) => h.reportDate <= reportDate).slice(0, 7);
  const values = window7.map((h) => h.articlesPublished).filter((v): v is number => v != null);
  const sevenDayAvgArticlesPublished = values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
    : null;

  return {
    today: today ? { reportDate: today.reportDate, articlesPublished: today.articlesPublished } : null,
    yesterday: yesterday
      ? { reportDate: yesterday.reportDate, articlesPublished: yesterday.articlesPublished }
      : null,
    sevenDayAvgArticlesPublished,
  };
}

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "monitoring:read");
  if (!guard.ok) return guard.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const supabase = createAdminServerClient();

  try {
    const history = await fetchRecentReports(supabase, 8);
    const reportDate = isValidDateParam(dateParam) ? dateParam : await resolveLatestReportDate(supabase);

    // Catch-up only applies to the default ("latest") view — navigating to
    // an explicit historical ?date= should never trigger generation.
    let catchUp: { status: "triggered" | "in_progress" | "none"; reportDate: string } | null = null;
    if (!dateParam) {
      const expectedReportDate = yesterdayIstDay();
      const claim = await claimReportGenerationIfMissing(expectedReportDate);
      if (claim === "claimed") {
        after(() => runCatchUpGeneration(expectedReportDate));
      }
      catchUp = { status: catchUpStatusFromClaim(claim), reportDate: expectedReportDate };
    }

    if (!reportDate) {
      return NextResponse.json(
        { ok: true, report: null, metrics: [], findings: [], actions: [], history, comparison: null, catchUp },
        { headers: noStoreHeaders() }
      );
    }

    const bundle = await fetchReportBundle(supabase, reportDate);
    if (!bundle) {
      return NextResponse.json(
        { ok: false, error: "report_not_found", reportDate, history, catchUp },
        { status: 404, headers: noStoreHeaders() }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        catchUp,
        report: {
          id: bundle.report.id,
          reportDate: bundle.report.report_date,
          status: bundle.report.status,
          generatedAt: bundle.report.generated_at,
          deterministicMetrics: bundle.report.deterministic_metrics,
          aiAnalysis: bundle.report.ai_analysis,
          aiProvider: bundle.report.ai_provider,
          aiModel: bundle.report.ai_model,
          aiStatus: bundle.report.ai_status,
          buildSha: bundle.report.build_sha,
        },
        metrics: bundle.metrics.map((m) => ({
          id: m.id,
          category: m.category,
          metricKey: m.metric_key,
          metricValue: m.metric_value,
          unit: m.unit,
          evidence: m.evidence,
        })),
        findings: bundle.findings.map((f) => ({
          id: f.id,
          severity: f.severity,
          category: f.category,
          title: f.title,
          observedFact: f.observed_fact,
          aiInterpretation: f.ai_interpretation,
          evidence: f.evidence,
          confidence: f.confidence,
          source: f.source,
        })),
        actions: bundle.actions.map((a) => ({
          id: a.id,
          findingId: a.finding_id,
          action: a.action,
          expectedImpact: a.expected_impact,
          ownerSubsystem: a.owner_subsystem,
          urgency: a.urgency,
          automationEligible: a.automation_eligible,
          status: a.status,
          idempotencyKey: a.idempotency_key,
          executedAt: a.executed_at,
          executedBy: a.executed_by,
        })),
        history,
        comparison: computeComparison(reportDate, history),
      },
      { headers: noStoreHeaders() }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "daily_report_fetch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: noStoreHeaders() });
  }
}
