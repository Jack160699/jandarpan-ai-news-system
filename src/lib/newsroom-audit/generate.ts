/**
 * Daily Newsroom Audit Report — core report-generation pipeline.
 *
 * Extracted from /api/cron/newsroom-daily-report so the admin manual-trigger
 * route (/api/admin/reports/daily/generate) can run the exact same
 * collect -> persist -> analyze -> persist findings/notifications pipeline
 * without duplicating it. The cron route now just wraps this with cron
 * auth/instrumentation; this file has no cron-specific concerns (no
 * verifyCronRequest, no instrumentCronStart/finalizeCronRun).
 *
 * Idempotent by construction: daily_newsroom_reports is upserted on the
 * unique report_date column, and metrics/findings rows are deleted then
 * reinserted for that report on every run instead of appended. Actions are
 * idempotent via daily_newsroom_report_actions.idempotency_key.
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { formatIstDay } from "@/lib/autonomous/ist-day";
import { getBuildInfo } from "@/lib/observability/build-info";
import { pipelineWarn } from "@/lib/observability/production-log";
import {
  collectDailyMetrics,
  type DeterministicReport,
  type MetricResult,
} from "@/lib/newsroom-audit/collect";
import { analyzeDailyReport, type AiAnalysisResult } from "@/lib/newsroom-audit/analyze";
import {
  runAutomatedActionsIfEnabled,
  type RecommendedAction,
} from "@/lib/newsroom-audit/actions";

export const REPORT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidReportDateParam(value: string | null | undefined): value is string {
  return !!value && REPORT_DATE_RE.test(value);
}

/**
 * Default report date for both the cron job and the manual-trigger route:
 * yesterday's IST calendar date. The cron fires shortly after IST midnight,
 * so "today" at trigger time is minutes old and has no data yet; "the day
 * that just closed" is the meaningful default for a daily audit (same
 * reasoning as district-coverage's IST-day convention). `?date=`/`{date}`
 * still allows targeting any day, including "today," on demand.
 */
export function yesterdayIstDay(): string {
  const nowIst = formatIstDay();
  const [y, m, d] = nowIst.split("-").map(Number);
  const prev = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) - 1));
  return formatIstDay(prev);
}

function isOk<T>(m: MetricResult<T>): m is { status: "ok"; value: T } {
  return m.status === "ok";
}

type DeterministicFinding = {
  severity: "informational" | "success" | "warning" | "critical";
  category: string;
  title: string;
  observed_fact: string;
  evidence: Record<string, unknown>;
};

function buildDeterministicFindings(report: DeterministicReport): DeterministicFinding[] {
  const findings: DeterministicFinding[] = [];

  const { content_production, quality, ai_provider_usage, images, pipeline_infrastructure } = report;

  if (isOk(content_production.articlesPublished) && content_production.articlesPublished.value === 0) {
    findings.push({
      severity: "critical",
      category: "content_production",
      title: "No articles published today",
      observed_fact: "content_production.articlesPublished.value = 0",
      evidence: { field: "content_production.articlesPublished" },
    });
  }

  if (isOk(quality.emptyArticleBody) && quality.emptyArticleBody.value > 0) {
    findings.push({
      severity: "warning",
      category: "quality",
      title: `${quality.emptyArticleBody.value} article(s) created with an empty body`,
      observed_fact: `quality.emptyArticleBody.value = ${quality.emptyArticleBody.value}`,
      evidence: { field: "quality.emptyArticleBody" },
    });
  }

  if (isOk(quality.missingHeroImage) && quality.missingHeroImage.value > 0) {
    findings.push({
      severity: "informational",
      category: "quality",
      title: `${quality.missingHeroImage.value} article(s) missing a hero image`,
      observed_fact: `quality.missingHeroImage.value = ${quality.missingHeroImage.value}`,
      evidence: { field: "quality.missingHeroImage" },
    });
  }

  if (isOk(ai_provider_usage.successRate) && ai_provider_usage.successRate.value !== null) {
    const rate = ai_provider_usage.successRate.value;
    if (rate < 0.5) {
      findings.push({
        severity: "critical",
        category: "ai_provider_usage",
        title: `AI provider success rate is ${Math.round(rate * 100)}%`,
        observed_fact: `ai_provider_usage.successRate.value = ${rate}`,
        evidence: { field: "ai_provider_usage.successRate" },
      });
    } else if (rate < 0.85) {
      findings.push({
        severity: "warning",
        category: "ai_provider_usage",
        title: `AI provider success rate is ${Math.round(rate * 100)}%`,
        observed_fact: `ai_provider_usage.successRate.value = ${rate}`,
        evidence: { field: "ai_provider_usage.successRate" },
      });
    }
  }

  if (isOk(images.failed) && images.failed.value > 0) {
    findings.push({
      severity: "warning",
      category: "images",
      title: `${images.failed.value} editorial image job(s) failed today`,
      observed_fact: `images.failed.value = ${images.failed.value}`,
      evidence: { field: "images.failed" },
    });
  }

  if (isOk(pipeline_infrastructure.deadLetters) && pipeline_infrastructure.deadLetters.value > 0) {
    findings.push({
      severity: pipeline_infrastructure.deadLetters.value >= 10 ? "critical" : "warning",
      category: "pipeline_infrastructure",
      title: `${pipeline_infrastructure.deadLetters.value} job(s) landed in the dead-letter queue`,
      observed_fact: `pipeline_infrastructure.deadLetters.value = ${pipeline_infrastructure.deadLetters.value}`,
      evidence: { field: "pipeline_infrastructure.deadLetters" },
    });
  }

  if (
    isOk(pipeline_infrastructure.errorEventsBySeverity) &&
    (pipeline_infrastructure.errorEventsBySeverity.value.critical ?? 0) > 0
  ) {
    const n = pipeline_infrastructure.errorEventsBySeverity.value.critical ?? 0;
    findings.push({
      severity: "critical",
      category: "pipeline_infrastructure",
      title: `${n} critical ops error event(s) recorded today`,
      observed_fact: `pipeline_infrastructure.errorEventsBySeverity.value.critical = ${n}`,
      evidence: { field: "pipeline_infrastructure.errorEventsBySeverity" },
    });
  }

  return findings;
}

function flattenMetricRows(
  report: DeterministicReport
): Array<{ category: string; metric_key: string; metric_value: unknown }> {
  const sections: Array<[string, Record<string, unknown>]> = [
    ["content_production", report.content_production],
    ["content_mix", report.content_mix],
    ["freshness", report.freshness],
    ["quality", report.quality],
    ["ai_provider_usage", report.ai_provider_usage],
    ["embeddings_clustering", report.embeddings_clustering],
    ["images", report.images],
    ["pipeline_infrastructure", report.pipeline_infrastructure],
    ["audience_seo", report.audience_seo as unknown as Record<string, unknown>],
  ];

  const rows: Array<{ category: string; metric_key: string; metric_value: unknown }> = [];
  for (const [category, fields] of sections) {
    for (const [key, value] of Object.entries(fields)) {
      if (key === "note") continue;
      rows.push({ category, metric_key: key, metric_value: value as unknown });
    }
  }
  return rows;
}

export type GenerateDailyReportResult =
  | {
      ok: true;
      reportId: string;
      reportDate: string;
      metrics: number;
      deterministicFindings: number;
      aiStatus: AiAnalysisResult["ai_status"];
      notificationsCreated: number;
      actionsRecommended: number;
    }
  | { ok: false; reportDate: string; error: string };

/**
 * Build the Daily Newsroom Audit Report for one IST calendar day:
 * deterministic metrics (collect.ts) -> AI executive summary (analyze.ts) ->
 * persisted rows (daily_newsroom_reports/_metrics/_findings/_actions) ->
 * deduped operator notifications -> optional gated automation.
 */
export async function generateDailyReport(reportDate: string): Promise<GenerateDailyReportResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reportDate, error: "supabase_not_configured" };
  }

  const supabase = createAdminServerClient();

  try {
    const deterministic = await collectDailyMetrics(reportDate);

    const { data: upserted, error: upsertErr } = await supabase
      .from("daily_newsroom_reports" as never)
      .upsert(
        {
          report_date: reportDate,
          status: "draft",
          generated_at: new Date().toISOString(),
          deterministic_metrics: deterministic as unknown as never,
          ai_status: "pending",
          build_sha: getBuildInfo().gitSha,
        } as never,
        { onConflict: "report_date" }
      )
      .select("id")
      .single();

    if (upsertErr || !upserted) {
      throw new Error(upsertErr?.message ?? "report_upsert_failed");
    }
    const reportId = (upserted as { id: string }).id;

    // Idempotent re-run strategy: delete-then-reinsert metrics/findings for this report.
    await supabase.from("daily_newsroom_report_metrics" as never).delete().eq("report_id", reportId);
    await supabase.from("daily_newsroom_report_findings" as never).delete().eq("report_id", reportId);

    const metricRows = flattenMetricRows(deterministic).map((r) => ({
      report_id: reportId,
      category: r.category,
      metric_key: r.metric_key,
      metric_value: r.metric_value as never,
    }));
    if (metricRows.length) {
      const { error } = await supabase
        .from("daily_newsroom_report_metrics" as never)
        .insert(metricRows as never);
      if (error) pipelineWarn("[newsroom_audit_metrics_insert_error]", { reportId, reason: error.message });
    }

    const deterministicFindings = buildDeterministicFindings(deterministic);
    const findingIdByTitle = new Map<string, string>();
    if (deterministicFindings.length) {
      const { data: insertedFindings, error } = await supabase
        .from("daily_newsroom_report_findings" as never)
        .insert(
          deterministicFindings.map((f) => ({
            report_id: reportId,
            severity: f.severity,
            category: f.category,
            title: f.title,
            observed_fact: f.observed_fact,
            evidence: f.evidence as never,
            confidence: "high",
            source: "deterministic",
          })) as never
        )
        .select("id,title");
      if (error) {
        pipelineWarn("[newsroom_audit_findings_insert_error]", { reportId, reason: error.message });
      } else {
        for (const row of (insertedFindings ?? []) as Array<{ id: string; title: string }>) {
          findingIdByTitle.set(row.title, row.id);
        }
      }
    }

    // AI executive summary — never throws; deterministic report stands alone on failure.
    const aiResult: AiAnalysisResult = await analyzeDailyReport(deterministic);

    const recommendedActions: RecommendedAction[] = [];

    if (aiResult.ai_status === "completed") {
      const aiFindingRows: Array<{
        severity: "success" | "warning" | "critical";
        category: string;
        title: string;
        ai_interpretation: string;
      }> = [
        ...aiResult.achievements.map((title) => ({
          severity: "success" as const,
          category: "ai_summary",
          title,
          ai_interpretation: title,
        })),
        ...aiResult.warnings.map((title) => ({
          severity: "warning" as const,
          category: "ai_summary",
          title,
          ai_interpretation: title,
        })),
        ...aiResult.problems.map((title) => ({
          severity: "critical" as const,
          category: "ai_summary",
          title,
          ai_interpretation: title,
        })),
      ];

      if (aiFindingRows.length) {
        const { data: insertedAiFindings, error } = await supabase
          .from("daily_newsroom_report_findings" as never)
          .insert(
            aiFindingRows.map((f) => ({
              report_id: reportId,
              severity: f.severity,
              category: f.category,
              title: f.title.slice(0, 500),
              ai_interpretation: f.ai_interpretation,
              confidence: "medium",
              source: "ai",
            })) as never
          )
          .select("id,title");
        if (error) {
          pipelineWarn("[newsroom_audit_ai_findings_insert_error]", { reportId, reason: error.message });
        } else {
          for (const row of (insertedAiFindings ?? []) as Array<{ id: string; title: string }>) {
            findingIdByTitle.set(row.title, row.id);
          }
        }
      }

      for (const action of aiResult.actions) {
        recommendedActions.push({
          action: action.action,
          expectedImpact: action.expected_impact,
          ownerSubsystem: action.owner_subsystem,
          urgency: action.urgency,
          automationEligible: action.automation_eligible,
          findingId: null,
        });
      }
    }

    await supabase
      .from("daily_newsroom_reports" as never)
      .update({
        ai_analysis: aiResult as unknown as never,
        ai_provider: aiResult.ai_status === "completed" ? aiResult.provider : null,
        ai_model: aiResult.ai_status === "completed" ? aiResult.model : null,
        ai_status: aiResult.ai_status,
        status: aiResult.ai_status === "completed" ? "final" : "draft",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", reportId);

    // Notifications: dedupe against any currently-open (unresolved) notification with the same incident key.
    const allFindingsForNotify: DeterministicFinding[] = [
      ...deterministicFindings,
      ...(aiResult.ai_status === "completed"
        ? [
            ...aiResult.warnings.map((title) => ({
              severity: "warning" as const,
              category: "ai_summary",
              title,
              observed_fact: title,
              evidence: {},
            })),
            ...aiResult.problems.map((title) => ({
              severity: "critical" as const,
              category: "ai_summary",
              title,
              observed_fact: title,
              evidence: {},
            })),
          ]
        : []),
    ];

    let notificationsCreated = 0;
    for (const finding of allFindingsForNotify) {
      if (finding.severity !== "warning" && finding.severity !== "critical") continue;
      const incidentKey = `${reportDate}:${finding.category}:${finding.title}`.slice(0, 500);
      const { data: existing } = await supabase
        .from("daily_newsroom_notifications" as never)
        .select("id")
        .eq("incident_key", incidentKey)
        .is("resolved_at", null)
        .limit(1);
      if (existing && existing.length) continue;

      const { error } = await supabase.from("daily_newsroom_notifications" as never).insert({
        report_id: reportId,
        incident_key: incidentKey,
        title: finding.title,
        message: finding.observed_fact,
        severity: finding.severity,
        category: finding.category,
        evidence: finding.evidence as never,
      } as never);
      if (!error) notificationsCreated += 1;
    }

    await runAutomatedActionsIfEnabled(reportId, recommendedActions);

    return {
      ok: true,
      reportId,
      reportDate,
      metrics: metricRows.length,
      deterministicFindings: deterministicFindings.length,
      aiStatus: aiResult.ai_status,
      notificationsCreated,
      actionsRecommended: recommendedActions.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "newsroom_daily_report_failed";
    return { ok: false, reportDate, error: message };
  }
}
