"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EvidenceDrawer } from "@/components/admin-newsroom/EvidenceDrawer";
import { cn } from "@/lib/cn";

/* ---------------------------------------------------------------------- */
/* Types mirroring /api/admin/reports/daily's JSON response (camelCase).   */
/* Kept local to this client component rather than imported from the      */
/* server route/lib files, matching how other admin panels type their     */
/* fetch payloads.                                                        */
/* ---------------------------------------------------------------------- */

type MetricResult<T> =
  | { status: "ok"; value: T }
  | { status: "unavailable"; value: null; reason: string };

type DeterministicMetrics = {
  reportDate: string;
  windowStartIso: string;
  windowEndIso: string;
  collectedAt: string;
  content_production: {
    articlesCreated: MetricResult<number>;
    articlesPublished: MetricResult<number>;
    byWorkflowStatus: MetricResult<Record<string, number>>;
    eventsCreated: MetricResult<number>;
  };
  content_mix: {
    byCategory: MetricResult<Array<{ category: string; count: number }>>;
    byRegion: MetricResult<Array<{ region: string; count: number }>>;
    byLanguage: MetricResult<Array<{ language: string; count: number }>>;
  };
  freshness: {
    avgEventToPublishMinutes: MetricResult<number | null>;
    publishedWithoutEventLink: MetricResult<number>;
    oldestUnpublishedDraftHours: MetricResult<number | null>;
  };
  quality: {
    missingHeroImage: MetricResult<number>;
    missingSummary: MetricResult<number>;
    emptyArticleBody: MetricResult<number>;
    missingReadingTime: MetricResult<number>;
    workflowRejections: MetricResult<number>;
  };
  ai_provider_usage: {
    totalRequests: MetricResult<number>;
    successRate: MetricResult<number | null>;
    byProvider: MetricResult<
      Array<{ provider: string; requests: number; success: number; failed: number; estimatedCostUsd: number }>
    >;
    fallbackEvents: MetricResult<number>;
    totalEstimatedCostUsd: MetricResult<number>;
  };
  provider_quota: {
    buckets: MetricResult<
      Array<{
        provider: string;
        model: string | null;
        scope: "rpm" | "tpm" | "rpd" | "tpd";
        limit: number | null;
        used: number | null;
        remaining: number | null;
        unavailable: boolean;
      }>
    >;
  };
  embeddings_clustering: {
    embeddingsCreatedOpenAi: MetricResult<number>;
    embeddingsCreatedCloudflare: MetricResult<number>;
    eventsWithMultipleSources: MetricResult<number>;
    avgSourceCountPerEvent: MetricResult<number | null>;
  };
  images: {
    queued: MetricResult<number>;
    completed: MetricResult<number>;
    failed: MetricResult<number>;
    pending: MetricResult<number>;
  };
  pipeline_infrastructure: {
    jobsCompleted: MetricResult<number>;
    jobsFailed: MetricResult<number>;
    deadLetters: MetricResult<number>;
    cronRuns: MetricResult<Array<{ job: string; ok: number; degraded: number; failed: number; total: number }>>;
    errorEventsBySeverity: MetricResult<Record<string, number>>;
  };
  audience_seo: {
    searchImpressions: MetricResult<number>;
    searchClicks: MetricResult<number>;
    searchAvgPosition: MetricResult<number>;
    pageviews: MetricResult<number>;
    note: string;
  };
};

type AiAnalysisAction = {
  action: string;
  expected_impact: string;
  owner_subsystem: string;
  urgency: "low" | "medium" | "high" | "critical";
  automation_eligible: boolean;
  confidence: "low" | "medium" | "high";
  evidence_refs: string[];
};

type AiAnalysisResult =
  | {
      status: "healthy" | "warning" | "critical";
      executive_summary: string;
      achievements: string[];
      problems: string[];
      warnings: string[];
      actions: AiAnalysisAction[];
      provider: string | null;
      model: string | null;
      ai_status: "completed";
    }
  | { ai_status: "unavailable" | "failed"; reason: string };

type ReportRecord = {
  id: string;
  reportDate: string;
  status: "draft" | "final";
  generatedAt: string;
  deterministicMetrics: DeterministicMetrics;
  aiAnalysis: AiAnalysisResult | null;
  aiProvider: string | null;
  aiModel: string | null;
  aiStatus: "pending" | "completed" | "unavailable" | "failed" | null;
  buildSha: string | null;
};

type FindingRecord = {
  id: string;
  severity: "informational" | "success" | "warning" | "critical";
  category: string;
  title: string;
  observedFact: string | null;
  aiInterpretation: string | null;
  evidence: unknown;
  confidence: "low" | "medium" | "high" | null;
  source: "deterministic" | "ai";
};

type HistoryRow = {
  reportDate: string;
  status: string;
  aiStatus: string | null;
  generatedAt: string;
  articlesPublished: number | null;
  aiOverallStatus: string | null;
};

type Comparison = {
  today: { reportDate: string; articlesPublished: number | null } | null;
  yesterday: { reportDate: string; articlesPublished: number | null } | null;
  sevenDayAvgArticlesPublished: number | null;
} | null;

type ReportApiResponse =
  | {
      ok: true;
      report: ReportRecord | null;
      metrics: unknown[];
      findings: FindingRecord[];
      actions: unknown[];
      history: HistoryRow[];
      comparison: Comparison;
    }
  | { ok: false; error: string; reportDate?: string; history?: HistoryRow[] };

/* ---------------------------------------------------------------------- */
/* Constants                                                               */
/* ---------------------------------------------------------------------- */

/**
 * UI-side daily publication target. The collector (collect.ts) has no
 * "target" field of its own — it only reports the actual articlesPublished
 * count — so this constant lives here in the panel, not as a fabricated
 * collector field, and progress is computed against the real metric value.
 */
const DAILY_ARTICLE_TARGET = 100;

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];
const CHART_GRID = "rgba(255,255,255,0.04)";
const CHART_AXIS = "#71717a";
const CHART_TOOLTIP_STYLE = {
  background: "rgba(10,10,14,0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  fontSize: 12,
};

const SEVERITY_ORDER: FindingRecord["severity"][] = ["critical", "warning", "informational", "success"];
const SEVERITY_LABEL: Record<FindingRecord["severity"], string> = {
  critical: "Critical",
  warning: "Warning",
  informational: "Informational",
  success: "Positive",
};

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */

function badgeVariantForSeverity(value: string): "default" | "success" | "warning" | "destructive" {
  if (value === "critical") return "destructive";
  if (value === "warning") return "warning";
  if (value === "success" || value === "healthy" || value === "final" || value === "completed") return "success";
  return "default";
}

function metricNumber(m: MetricResult<number | null> | undefined): {
  display: string;
  unavailable: boolean;
  reason?: string;
} {
  if (!m) return { display: "—", unavailable: true };
  if (m.status === "ok") return { display: m.value == null ? "—" : String(m.value), unavailable: false };
  return { display: "Unavailable", unavailable: true, reason: m.reason };
}

function resolveEvidencePath(root: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/* ---------------------------------------------------------------------- */
/* Sub-sections                                                            */
/* ---------------------------------------------------------------------- */

function ExecutiveHeader({
  report,
  criticalFindingsCount,
}: {
  report: ReportRecord;
  criticalFindingsCount: number;
}) {
  const ai = report.aiAnalysis;
  const aiCompleted = ai != null && ai.ai_status === "completed";
  const overallStatus = aiCompleted
    ? ai.status
    : criticalFindingsCount > 0
      ? "critical"
      : "unknown";

  const published = report.deterministicMetrics.content_production.articlesPublished;
  const publishedValue = published.status === "ok" ? published.value : null;
  const progressPct =
    publishedValue != null ? Math.min(100, Math.round((publishedValue / DAILY_ARTICLE_TARGET) * 100)) : null;

  const usage = report.deterministicMetrics.ai_provider_usage;
  const successRate = usage.successRate.status === "ok" ? usage.successRate.value : null;
  const totalRequests = usage.totalRequests.status === "ok" ? usage.totalRequests.value : null;
  const fallbackEvents = usage.fallbackEvents.status === "ok" ? usage.fallbackEvents.value : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Overall status</CardDescription>
          <CardTitle className="text-base">
            <Badge variant={badgeVariantForSeverity(overallStatus)}>
              {overallStatus === "unknown" ? "Deterministic only" : overallStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-zinc-400">
          {aiCompleted
            ? "From AI executive summary"
            : "AI analysis unavailable — status derived from deterministic findings"}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Publication progress</CardDescription>
          <CardTitle className="text-base">
            {publishedValue != null ? `${publishedValue} / ${DAILY_ARTICLE_TARGET}` : "Unavailable"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progressPct ?? 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {progressPct != null
              ? `${progressPct}% of daily target`
              : published.status === "unavailable"
                ? published.reason
                : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>AI provider health</CardDescription>
          <CardTitle className="text-base">
            {successRate != null ? `${Math.round(successRate * 100)}% success` : "Unavailable"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-zinc-400">
          {totalRequests != null ? `${totalRequests} requests` : "No usage data"}
          {fallbackEvents != null ? ` · ${fallbackEvents} fallback` : ""}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Critical alerts</CardDescription>
          <CardTitle className="text-base">{criticalFindingsCount}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-zinc-400">Findings at critical severity</CardContent>
      </Card>
    </div>
  );
}

function RecommendedActionsSection({ report }: { report: ReportRecord }) {
  const ai = report.aiAnalysis;
  const actions = ai && ai.ai_status === "completed" ? ai.actions : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended actions</CardTitle>
        <CardDescription>
          {!ai
            ? "AI analysis not run for this report"
            : ai.ai_status === "completed"
              ? `${actions.length} action(s) from the AI executive summary`
              : `AI analysis ${ai.ai_status}: ${ai.reason}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length === 0 ? (
          <p className="text-sm text-zinc-400">No AI-recommended actions for this report.</p>
        ) : (
          actions.map((a, i) => (
            <div key={i} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={a.urgency === "critical" || a.urgency === "high" ? "destructive" : a.urgency === "medium" ? "warning" : "default"}>
                  {a.urgency}
                </Badge>
                <span className="text-sm font-medium text-zinc-100">{a.action}</span>
                {a.automation_eligible ? <Badge variant="success">Automation-eligible</Badge> : null}
                <span className="text-xs text-zinc-500">Confidence: {a.confidence}</span>
              </div>
              {a.expected_impact ? <p className="mt-1 text-xs text-zinc-400">{a.expected_impact}</p> : null}
              <p className="mt-1 text-xs text-zinc-500">Owner: {a.owner_subsystem}</p>
              <EvidenceDrawer
                label="Evidence"
                data={a.evidence_refs.map((path) => ({
                  path,
                  value: resolveEvidencePath(report.deterministicMetrics, path),
                }))}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  metric,
  dataKey,
  nameKey,
  color,
}: {
  title: string;
  description?: string;
  metric: MetricResult<Array<Record<string, unknown>>>;
  dataKey: string;
  nameKey: string;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {metric.status === "unavailable" ? (
          <p className="text-sm text-zinc-500">Not available — {metric.reason}</p>
        ) : metric.value.length === 0 ? (
          <p className="text-sm text-zinc-500">No data for this day.</p>
        ) : (
          <div className="h-56 w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={280}>
              <BarChart data={metric.value} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey={nameKey} tick={{ fontSize: 10, fill: CHART_AXIS }} stroke={CHART_AXIS} />
                <YAxis tick={{ fontSize: 10, fill: CHART_AXIS }} stroke={CHART_AXIS} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey={dataKey} fill={color ?? CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AiUsageChart({ metrics }: { metrics: DeterministicMetrics["ai_provider_usage"] }) {
  const byProvider = metrics.byProvider;
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI provider usage</CardTitle>
        <CardDescription>
          {metrics.totalRequests.status === "ok" ? `${metrics.totalRequests.value} requests today` : "Request volume unavailable"}
          {metrics.totalEstimatedCostUsd.status === "ok"
            ? ` · $${metrics.totalEstimatedCostUsd.value.toFixed(4)} est. cost`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {byProvider.status === "unavailable" ? (
          <p className="text-sm text-zinc-500">Not available — {byProvider.reason}</p>
        ) : byProvider.value.length === 0 ? (
          <p className="text-sm text-zinc-500">No AI provider activity recorded for this day.</p>
        ) : (
          <div className="h-56 w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={280}>
              <BarChart data={byProvider.value} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="provider" tick={{ fontSize: 10, fill: CHART_AXIS }} stroke={CHART_AXIS} />
                <YAxis tick={{ fontSize: 10, fill: CHART_AXIS }} stroke={CHART_AXIS} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="success" name="Success" stackId="req" fill={CHART_COLORS[1]} />
                <Bar dataKey="failed" name="Failed" stackId="req" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProviderQuotaCard({ quota }: { quota: DeterministicMetrics["provider_quota"] }) {
  const buckets = quota.buckets;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider quota status</CardTitle>
        <CardDescription>Model-specific rpm/tpm/rpd/tpd, read live at report time.</CardDescription>
      </CardHeader>
      <CardContent>
        {buckets.status === "unavailable" ? (
          <p className="text-sm text-zinc-500">Not available — {buckets.reason}</p>
        ) : buckets.value.length === 0 ? (
          <p className="text-sm text-zinc-500">No tracked quota buckets.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-zinc-500">
                  <th className="py-1 pr-3 font-medium">Provider</th>
                  <th className="py-1 pr-3 font-medium">Model</th>
                  <th className="py-1 pr-3 font-medium">Scope</th>
                  <th className="py-1 pr-3 font-medium">Used</th>
                  <th className="py-1 pr-3 font-medium">Limit</th>
                  <th className="py-1 pr-3 font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {buckets.value.map((b, i) => (
                  <tr key={`${b.provider}-${b.model ?? "default"}-${b.scope}-${i}`} className="border-t border-zinc-800">
                    <td className="py-1 pr-3">{b.provider}</td>
                    <td className="py-1 pr-3 text-zinc-400">{b.model ?? "—"}</td>
                    <td className="py-1 pr-3 uppercase text-zinc-400">{b.scope}</td>
                    {b.unavailable ? (
                      <td colSpan={3} className="py-1 pr-3 italic text-zinc-500">
                        unavailable — not exposed by provider
                      </td>
                    ) : (
                      <>
                        <td className="py-1 pr-3">{b.used}</td>
                        <td className="py-1 pr-3">{b.limit}</td>
                        <td className="py-1 pr-3">{b.remaining}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AudienceSeoCard({ audienceSeo }: { audienceSeo: DeterministicMetrics["audience_seo"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience & SEO</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-500">Integration not connected.</p>
        <p className="mt-1 text-xs text-zinc-600">{audienceSeo.note}</p>
      </CardContent>
    </Card>
  );
}

function AdditionalSignals({ metrics }: { metrics: DeterministicMetrics }) {
  const tiles: Array<{ label: string; metric: MetricResult<number | null> }> = [
    { label: "Missing hero image", metric: metrics.quality.missingHeroImage },
    { label: "Missing summary", metric: metrics.quality.missingSummary },
    { label: "Empty article body", metric: metrics.quality.emptyArticleBody },
    { label: "Workflow rejections", metric: metrics.quality.workflowRejections },
    { label: "Avg event→publish (min)", metric: metrics.freshness.avgEventToPublishMinutes },
    { label: "Published w/o event link", metric: metrics.freshness.publishedWithoutEventLink },
    { label: "Images failed", metric: metrics.images.failed },
    { label: "Images pending", metric: metrics.images.pending },
    { label: "Jobs failed", metric: metrics.pipeline_infrastructure.jobsFailed },
    { label: "Dead letters", metric: metrics.pipeline_infrastructure.deadLetters },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional deterministic signals</CardTitle>
        <CardDescription>
          Freshness, quality, images, and pipeline — every remaining query-backed field the collector measured.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((t) => {
            const info = metricNumber(t.metric);
            return (
              <div key={t.label} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3" title={info.reason}>
                <p className="text-[11px] text-zinc-500">{t.label}</p>
                <p className={cn("text-base font-semibold", info.unavailable ? "text-zinc-600" : "text-zinc-100")}>
                  {info.display}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FindingsSection({ findings }: { findings: FindingRecord[] }) {
  const grouped = useMemo(() => {
    const map = new Map<FindingRecord["severity"], FindingRecord[]>();
    for (const f of findings) {
      if (!map.has(f.severity)) map.set(f.severity, []);
      map.get(f.severity)!.push(f);
    }
    return map;
  }, [findings]);

  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">No findings recorded for this report.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings</CardTitle>
        <CardDescription>
          Grouped by severity. Observed fact (deterministic, monospace) is kept visually separate from AI
          interpretation (italic).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {SEVERITY_ORDER.filter((sev) => (grouped.get(sev)?.length ?? 0) > 0).map((sev) => (
          <div key={sev}>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={badgeVariantForSeverity(sev)}>{SEVERITY_LABEL[sev]}</Badge>
              <span className="text-xs text-zinc-500">{grouped.get(sev)?.length} finding(s)</span>
            </div>
            <div className="space-y-2">
              {grouped.get(sev)!.map((f) => (
                <div key={f.id} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{f.title}</span>
                    <Badge variant="default">{f.category}</Badge>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-600">{f.source}</span>
                  </div>
                  {f.observedFact ? <p className="mt-1 font-mono text-xs text-indigo-300">{f.observedFact}</p> : null}
                  {f.aiInterpretation ? <p className="mt-1 text-xs italic text-zinc-400">{f.aiInterpretation}</p> : null}
                  <EvidenceDrawer data={f.evidence} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ComparisonSection({ comparison }: { comparison: Comparison }) {
  if (!comparison) return null;
  const { today, yesterday, sevenDayAvgArticlesPublished } = comparison;
  const todayVal = today?.articlesPublished ?? null;
  const yestVal = yesterday?.articlesPublished ?? null;
  const delta = todayVal != null && yestVal != null ? todayVal - yestVal : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical comparison</CardTitle>
        <CardDescription>
          Articles published — today vs. yesterday vs. 7-day average. Deltas computed server-side in the
          /api/admin/reports/daily route.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-[11px] text-zinc-500">Today ({today?.reportDate ?? "—"})</p>
            <p className="text-lg font-semibold text-zinc-100">{todayVal ?? "—"}</p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-[11px] text-zinc-500">Yesterday ({yesterday?.reportDate ?? "—"})</p>
            <p className="text-lg font-semibold text-zinc-100">
              {yestVal ?? "—"}
              {delta != null ? (
                <span className={cn("ml-2 text-xs", delta >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {delta >= 0 ? "+" : ""}
                  {delta}
                </span>
              ) : null}
            </p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-[11px] text-zinc-500">7-day average</p>
            <p className="text-lg font-semibold text-zinc-100">{sevenDayAvgArticlesPublished ?? "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HistorySection({
  history,
  activeDate,
  onSelect,
}: {
  history: HistoryRow[];
  activeDate: string | null | undefined;
  onSelect: (date: string) => void;
}) {
  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report history</CardTitle>
        <CardDescription>Last {history.length} report(s). Click a date to view it.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">AI status</th>
                <th className="py-2 pr-4">Articles published</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr
                  key={h.reportDate}
                  className={cn(
                    "cursor-pointer border-b border-zinc-900 hover:bg-zinc-900/50",
                    h.reportDate === activeDate && "bg-zinc-900/70"
                  )}
                  onClick={() => onSelect(h.reportDate)}
                >
                  <td className="py-2 pr-4 font-medium text-zinc-200">{h.reportDate}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={badgeVariantForSeverity(h.status)}>{h.status}</Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={badgeVariantForSeverity(h.aiOverallStatus ?? h.aiStatus ?? "")}>
                      {h.aiStatus ?? "—"}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-zinc-300">{h.articlesPublished ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Main panel                                                              */
/* ---------------------------------------------------------------------- */

export function NewsroomDailyReportPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const [data, setData] = useState<ReportApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const load = useCallback(async (date: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = date ? `/api/admin/reports/daily?date=${date}` : "/api/admin/reports/daily";
      const res = await fetch(url, { credentials: "include" });
      const json = (await res.json()) as ReportApiResponse;
      setData(json);
      if (!json.ok) setError(json.error);
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(dateParam);
  }, [dateParam, load]);

  const goToDate = useCallback(
    (date: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", date);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  async function generateReport() {
    setGenerating(true);
    setGenerateMessage(null);
    try {
      const targetDate = dateParam ?? (data?.ok ? data.report?.reportDate : undefined) ?? undefined;
      const res = await fetch("/api/admin/reports/daily/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetDate ? { date: targetDate } : {}),
      });
      const json = (await res.json()) as { ok: boolean; reportDate: string; aiStatus?: string; error?: string };
      if (json.ok) {
        setGenerateMessage(`Report generated for ${json.reportDate} (AI status: ${json.aiStatus}).`);
        goToDate(json.reportDate);
      } else {
        setGenerateMessage(`Generate failed: ${json.error ?? "unknown_error"}`);
        void load(dateParam);
      }
    } catch {
      setGenerateMessage("Generate failed: network_error");
    } finally {
      setGenerating(false);
    }
  }

  function exportHref(format: "csv" | "json") {
    const params = new URLSearchParams();
    if (dateParam) params.set("date", dateParam);
    params.set("format", format);
    return `/api/admin/reports/daily/export?${params.toString()}`;
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/40" />
          ))}
        </div>
        <p className="text-sm text-zinc-400">Loading daily newsroom audit report…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load report</CardTitle>
          <CardDescription>{error ?? "Unknown error"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => void load(dateParam)}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const report = data.ok ? data.report : null;
  const findings = data.ok ? data.findings : [];
  const history = data.ok ? data.history : (data.history ?? []);
  const comparison = data.ok ? data.comparison : null;
  const supabaseNotConfigured = !data.ok && data.error === "supabase_not_configured";
  const notFoundForDate = !data.ok && data.error === "report_not_found";
  const criticalFindingsCount = findings.filter((f) => f.severity === "critical").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            {report ? report.reportDate : dateParam ?? "Latest report"}
          </h2>
          {report ? (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              Generated {new Date(report.generatedAt).toLocaleString()}
              <Badge variant={badgeVariantForSeverity(report.status)}>{report.status}</Badge>
              {report.buildSha ? <span>build {report.buildSha.slice(0, 7)}</span> : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">
              {supabaseNotConfigured
                ? "Supabase is not configured."
                : notFoundForDate
                  ? "No report exists for this date yet."
                  : "No reports have been generated yet."}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void generateReport()} disabled={generating}>
            {generating ? "Generating…" : "Generate report"}
          </Button>
          <a
            href={exportHref("csv")}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Export CSV
          </a>
          <a
            href={exportHref("json")}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Export JSON
          </a>
        </div>
      </div>

      {generateMessage ? <p className="text-xs text-zinc-400">{generateMessage}</p> : null}

      {!report ? (
        <Card>
          <CardHeader>
            <CardTitle>{notFoundForDate ? "No report for this date" : "No report available"}</CardTitle>
            <CardDescription>
              {supabaseNotConfigured
                ? "Configure Supabase to generate and view daily newsroom audit reports."
                : "Use “Generate report” above to build one for this date."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <ExecutiveHeader report={report} criticalFindingsCount={criticalFindingsCount} />
          <RecommendedActionsSection report={report} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Content mix by category"
              metric={report.deterministicMetrics.content_mix.byCategory}
              dataKey="count"
              nameKey="category"
              color={CHART_COLORS[0]}
            />
            <ChartCard
              title="District coverage"
              description="Articles by region"
              metric={report.deterministicMetrics.content_mix.byRegion}
              dataKey="count"
              nameKey="region"
              color={CHART_COLORS[2]}
            />
            <ChartCard
              title="Content mix by language"
              metric={report.deterministicMetrics.content_mix.byLanguage}
              dataKey="count"
              nameKey="language"
              color={CHART_COLORS[4]}
            />
            <AiUsageChart metrics={report.deterministicMetrics.ai_provider_usage} />
            <ProviderQuotaCard quota={report.deterministicMetrics.provider_quota} />
          </div>

          <AudienceSeoCard audienceSeo={report.deterministicMetrics.audience_seo} />
          <AdditionalSignals metrics={report.deterministicMetrics} />
          <FindingsSection findings={findings} />
        </>
      )}

      <ComparisonSection comparison={comparison} />
      <HistorySection history={history} activeDate={report?.reportDate ?? dateParam} onSelect={goToDate} />
    </div>
  );
}
