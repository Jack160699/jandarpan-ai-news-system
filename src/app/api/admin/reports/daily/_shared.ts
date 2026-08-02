/**
 * Shared Supabase read helpers for the Daily Newsroom Audit Report admin
 * API (GET .../daily and GET .../daily/export). Not a route file — file
 * names other than route.ts/page.tsx etc. are not treated as route
 * segments by Next.js, so this is a plain co-located module.
 *
 * Supabase generated types don't yet include the newsroom-audit tables
 * (migration 070 hasn't been applied to any live DB), so every `.from(...)`
 * call here casts the table name `as never`, matching the convention
 * already used in src/lib/newsroom-audit/generate.ts and the cron routes.
 */

import type { createAdminServerClient } from "@/lib/supabase";

type SupabaseAdminClient = ReturnType<typeof createAdminServerClient>;

export const REPORT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateParam(value: string | null): value is string {
  return !!value && REPORT_DATE_RE.test(value);
}

export type ReportRow = {
  id: string;
  report_date: string;
  status: "draft" | "final";
  generated_at: string;
  deterministic_metrics: unknown;
  ai_analysis: unknown;
  ai_provider: string | null;
  ai_model: string | null;
  ai_status: "pending" | "completed" | "unavailable" | "failed" | null;
  build_sha: string | null;
};

export type MetricRow = {
  id: string;
  category: string;
  metric_key: string;
  metric_value: unknown;
  unit: string | null;
  evidence: unknown;
};

export type FindingRow = {
  id: string;
  severity: "informational" | "success" | "warning" | "critical";
  category: string;
  title: string;
  observed_fact: string | null;
  ai_interpretation: string | null;
  evidence: unknown;
  confidence: "low" | "medium" | "high" | null;
  source: "deterministic" | "ai";
};

export type ActionRow = {
  id: string;
  finding_id: string | null;
  action: string;
  expected_impact: string | null;
  owner_subsystem: string | null;
  urgency: string | null;
  automation_eligible: boolean;
  status: string;
  idempotency_key: string | null;
  executed_at: string | null;
  executed_by: string | null;
};

export type ReportBundle = {
  report: ReportRow;
  metrics: MetricRow[];
  findings: FindingRow[];
  actions: ActionRow[];
};

export async function resolveLatestReportDate(supabase: SupabaseAdminClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("daily_newsroom_reports" as never)
    .select("report_date")
    .order("report_date", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = ((data ?? []) as Array<{ report_date: string }>)[0];
  return row?.report_date ?? null;
}

export async function fetchReportBundle(
  supabase: SupabaseAdminClient,
  reportDate: string
): Promise<ReportBundle | null> {
  const { data: reportRow, error: reportErr } = await supabase
    .from("daily_newsroom_reports" as never)
    .select(
      "id,report_date,status,generated_at,deterministic_metrics,ai_analysis,ai_provider,ai_model,ai_status,build_sha"
    )
    .eq("report_date", reportDate)
    .maybeSingle();
  if (reportErr) throw new Error(reportErr.message);
  if (!reportRow) return null;
  const report = reportRow as unknown as ReportRow;

  const [metricsRes, findingsRes, actionsRes] = await Promise.all([
    supabase
      .from("daily_newsroom_report_metrics" as never)
      .select("id,category,metric_key,metric_value,unit,evidence")
      .eq("report_id", report.id),
    supabase
      .from("daily_newsroom_report_findings" as never)
      .select("id,severity,category,title,observed_fact,ai_interpretation,evidence,confidence,source")
      .eq("report_id", report.id),
    supabase
      .from("daily_newsroom_report_actions" as never)
      .select(
        "id,finding_id,action,expected_impact,owner_subsystem,urgency,automation_eligible,status,idempotency_key,executed_at,executed_by"
      )
      .eq("report_id", report.id),
  ]);

  if (metricsRes.error) throw new Error(metricsRes.error.message);
  if (findingsRes.error) throw new Error(findingsRes.error.message);
  if (actionsRes.error) throw new Error(actionsRes.error.message);

  return {
    report,
    metrics: (metricsRes.data ?? []) as unknown as MetricRow[],
    findings: (findingsRes.data ?? []) as unknown as FindingRow[],
    actions: (actionsRes.data ?? []) as unknown as ActionRow[],
  };
}

export type HistoryRow = {
  reportDate: string;
  status: string;
  aiStatus: string | null;
  generatedAt: string;
  articlesPublished: number | null;
  aiOverallStatus: string | null;
};

function extractArticlesPublished(deterministic: unknown): number | null {
  const metric = (
    deterministic as {
      content_production?: { articlesPublished?: { status: string; value: number | null } };
    } | null
  )?.content_production?.articlesPublished;
  if (metric && metric.status === "ok" && typeof metric.value === "number") return metric.value;
  return null;
}

function extractAiOverallStatus(aiAnalysis: unknown): string | null {
  return (aiAnalysis as { status?: string } | null)?.status ?? null;
}

/** Recent report_date+status+ai_status rows for the history list and comparison deltas. */
export async function fetchRecentReports(
  supabase: SupabaseAdminClient,
  limit = 8
): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from("daily_newsroom_reports" as never)
    .select("report_date,status,ai_status,generated_at,deterministic_metrics,ai_analysis")
    .order("report_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (
    (data ?? []) as unknown as Array<{
      report_date: string;
      status: string;
      ai_status: string | null;
      generated_at: string;
      deterministic_metrics: unknown;
      ai_analysis: unknown;
    }>
  ).map((row) => ({
    reportDate: row.report_date,
    status: row.status,
    aiStatus: row.ai_status,
    generatedAt: row.generated_at,
    articlesPublished: extractArticlesPublished(row.deterministic_metrics),
    aiOverallStatus: extractAiOverallStatus(row.ai_analysis),
  }));
}
