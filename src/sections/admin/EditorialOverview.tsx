"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { StoriesTable } from "@/components/admin-newsroom/StoriesTable";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { AdminWidgetBoundary } from "@/components/admin-newsroom/ui/AdminWidgetBoundary";
import { ClientOnly } from "@/components/admin-newsroom/ui/ClientOnly";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { useHasMounted } from "@/hooks/useHasMounted";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import { NewsroomHealthStrip } from "@/components/admin-newsroom/NewsroomHealthStrip";
import { CoverageInsightsPanel } from "@/components/admin-newsroom/CoverageInsightsPanel";
import { CoverageOpportunityPanel } from "@/components/admin-newsroom/CoverageOpportunityPanel";
import { useEditorialIntelligenceSlices } from "@/hooks/use-editorial-intelligence-slices";
import { QueueTable } from "@/components/admin-newsroom/ui/QueueTable";
import { traceDashboardRender } from "@/lib/observability/dashboard-render-trace";

function useAnimatedNumber(value: number, durationMs = 700) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = display;
    let frame = 0;
    function step(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplay(from + (value - from) * progress);
      if (progress < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

function toneFromHealth(score: number): "stable" | "warning" | "breaking" {
  if (score >= 0.75) return "stable";
  if (score >= 0.45) return "warning";
  return "breaking";
}

function EditorialQuickLinks() {
  return (
    <section className="anr-cc-quick" aria-label="Editorial quick links">
      <h3>Quick links</h3>
      <div className="anr-cc-quick__row">
        <Link href="/admin/stories" className="av3-btn av3-btn--ghost">
          Story queue
        </Link>
        <Link href="/admin/articles" className="av3-btn av3-btn--ghost">
          All stories
        </Link>
        <Link href="/admin/editor" className="av3-btn av3-btn--ghost">
          Editor
        </Link>
      </div>
    </section>
  );
}

function EditorialKpiSkeletons({ count = 8 }: { count?: number }) {
  return (
    <div className="anr-kpis">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="anr-kpi">
          <div className="anr-skeleton" style={{ height: "2.5rem" }} />
        </div>
      ))}
    </div>
  );
}

function EditorialDegradedMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="anr-kpi anr-kpi--mission">
      <div className="anr-kpi__head">
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </article>
  );
}

function EditorialDegradedShell({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <>
      <section className="anr-cc-hero anr-cc-hero--degraded" style={{ marginBottom: "1.25rem" }}>
        <div className="anr-cc-hero__row">
          <div>
            <p className="anr-meta">Editorial dashboard degraded</p>
            <h2 className="anr-cc-hero__title">Live metrics unavailable</h2>
            <p className="anr-cc-hero__summary">
              The editorial dashboard source timed out or failed. You can still reach key routes below.
            </p>
            <p className="anr-error" style={{ marginTop: "0.65rem" }}>
              {error}
            </p>
            <div className="anr-cc-actions" style={{ marginTop: "0.85rem" }}>
              <button type="button" className="av3-btn av3-btn--ghost" onClick={() => void onRetry()}>
                Retry dashboard
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="anr-kpis">
        <EditorialDegradedMetric label="Story queue" value="—" />
        <EditorialDegradedMetric label="Published today" value="—" />
        <EditorialDegradedMetric label="Awaiting review" value="—" />
        <EditorialDegradedMetric label="Failed stories" value="—" />
        <EditorialDegradedMetric label="Ingestion" value="—" />
        <EditorialDegradedMetric label="Translation" value="—" />
        <EditorialDegradedMetric label="Breaking / live" value="—" />
        <EditorialDegradedMetric label="Recent activity" value="—" />
      </div>

      <EditorialQuickLinks />

      <AdminCard title="Dashboard source failed" description="Operational recovery">
        <p className="anr-meta">
          Editorial dashboard data could not be loaded. Retry the fetch or inspect platform health for
          upstream failures.
        </p>
        <div className="anr-cc-actions" style={{ marginTop: "0.75rem" }}>
          <button type="button" className="av3-btn av3-btn--ghost" onClick={() => void onRetry()}>
            Retry
          </button>
          <Link href="/admin/health" className="av3-btn av3-btn--ghost">
            Open Platform health
          </Link>
        </div>
      </AdminCard>
    </>
  );
}

function MissionMetricCard({
  label,
  value,
  trend,
  spark,
  live,
}: {
  label: string;
  value: number;
  trend: number;
  spark: Array<{ i: number; v: number }>;
  live?: boolean;
}) {
  const animated = useAnimatedNumber(value);
  const safeSpark = useMemo(
    () =>
      (Array.isArray(spark) ? spark : []).filter(
        (p) => Number.isFinite(p?.i) && Number.isFinite(p?.v)
      ),
    [spark]
  );
  return (
    <article className={`anr-kpi anr-kpi--mission ${live ? "anr-kpi--live" : ""}`}>
      <div className="anr-kpi__head">
        <span>{label}</span>
        <em className={`anr-trend ${trend >= 0 ? "anr-trend--up" : "anr-trend--down"}`}>
          {trend >= 0 ? `+${trend}%` : `${trend}%`}
        </em>
      </div>
      <strong>{Math.round(animated).toLocaleString("en-IN")}</strong>
      <div className="anr-kpi__spark">
        <ResponsiveContainer width="100%" height={36}>
          <AreaChart data={safeSpark}>
            <Area
              type="monotone"
              dataKey="v"
              stroke="#2563eb"
              fill="rgba(245,158,11,0.2)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {live ? <LiveIndicator label="Live metric" /> : null}
    </article>
  );
}

export function EditorialOverview() {
  const { data, loading, error, refresh } = useAdminNewsroom();
  const mounted = useHasMounted();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { health: newsroomHealth, coverage: coverageInsights, opportunities: coverageOpportunities } =
    useEditorialIntelligenceSlices(data ?? null);

  const generated = useMemo(
    () => (Array.isArray(data?.generatedArticles) ? data.generatedArticles : []),
    [data]
  );
  const ingestionLogs = useMemo(
    () =>
      Array.isArray(data?.ingestion?.recentLogs) ? data.ingestion.recentLogs : [],
    [data]
  );
  const ingestionFailures = useMemo(
    () =>
      Array.isArray(data?.ingestion?.recentFailures)
        ? data.ingestion.recentFailures
        : [],
    [data]
  );
  const sourceReliability = useMemo(
    () => (Array.isArray(data?.sourceReliability) ? data.sourceReliability : []),
    [data]
  );
  const sourceHealth = useMemo(
    () => (Array.isArray(data?.sourceHealth) ? data.sourceHealth : []),
    [data]
  );
  const aiQueue = useMemo(
    () => (Array.isArray(data?.aiQueue) ? data.aiQueue : []),
    [data]
  );
  const auditTrail = useMemo(
    () => (Array.isArray(data?.auditTrail) ? data.auditTrail : []),
    [data]
  );

  const pending = useMemo(
    () => generated.filter((a) => a.editorial_status === "pending"),
    [generated]
  );
  const approved = useMemo(
    () => generated.filter((a) => a.editorial_status === "approved"),
    [generated]
  );
  const rejected = useMemo(
    () => generated.filter((a) => a.editorial_status === "rejected"),
    [generated]
  );
  const breaking = useMemo(
    () => generated.filter((a) => a.is_breaking),
    [generated]
  );
  const aiConfRows = useMemo(
    () => generated.filter((a) => a.ai_confidence != null),
    [generated]
  );
  const avgConfidence = useMemo(
    () =>
      aiConfRows.reduce((sum, a) => sum + (a.ai_confidence ?? 0), 0) /
      Math.max(1, aiConfRows.length),
    [aiConfRows]
  );

  const ingestionOverTime = useMemo(() => {
    if (!mounted) return [];
    return ingestionLogs
      .slice(0, 12)
      .reverse()
      .map((log) => ({
        time: new Date(log.created_at).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        inserted: Number.isFinite(log.inserted) ? log.inserted : 0,
        failed: Number.isFinite(log.failed_validation) ? log.failed_validation : 0,
      }));
  }, [mounted, ingestionLogs]);

  const approvalsVsRejects = useMemo(
    () => [
      { name: "Approved", value: approved.length, color: "#22c55e" },
      { name: "Rejected", value: rejected.length, color: "#fb7185" },
      { name: "Pending", value: pending.length, color: "#2563eb" },
    ],
    [approved.length, rejected.length, pending.length]
  );

  const districtActivity = useMemo(
    () =>
      Object.entries(
        generated.reduce<Record<string, number>>((acc, article) => {
          const district = article.source_attribution[0]?.source ?? "General";
          acc[district] = (acc[district] ?? 0) + 1;
          return acc;
        }, {})
      )
        .slice(0, 8)
        .map(([district, count]) => ({ district, count })),
    [generated]
  );

  const sourceReliabilityTrend = useMemo(
    () =>
      sourceReliability
        .slice(0, 8)
        .map((s) => ({
          source: (s.source ?? "").slice(0, 12) || "Source",
          confidence: Number.isFinite(s.avgConfidence)
            ? Math.round(s.avgConfidence * 100)
            : 0,
        }))
        .filter((row) => Number.isFinite(row.confidence)),
    [sourceReliability]
  );

  const pulseFeed = useMemo(
    () =>
      [
        ...approved.slice(0, 4).map((a) => ({
          tone: "stable",
          text: `Approved: ${a.headline}`,
          at: a.published_at ?? a.created_at,
        })),
        ...breaking.slice(0, 3).map((a) => ({
          tone: "breaking",
          text: `Breaking alert: ${a.headline}`,
          at: a.created_at,
        })),
        ...ingestionFailures.slice(0, 3).map((f) => ({
          tone: "warning",
          text: `Ingestion failure: ${f.title ?? "Untitled"} (${f.reason})`,
          at: f.created_at,
        })),
        ...aiQueue
          .filter((q) => q.error)
          .slice(0, 3)
          .map((q) => ({
            tone: "warning",
            text: `AI moderation warning: ${q.error}`,
            at: q.created_at,
          })),
      ]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 12),
    [approved, breaking, ingestionFailures, aiQueue]
  );

  const sourceStable = useMemo(
    () => sourceHealth.filter((s) => s.healthy).length,
    [sourceHealth]
  );
  const queuePressure = useMemo(
    () =>
      data
        ? (data.counts.pending +
            data.counts.aiQueuePending +
            data.counts.imageQueuePending) /
          Math.max(1, data.counts.generated)
        : 0,
    [data]
  );
  const queueTone = useMemo(
    () => toneFromHealth(1 - Math.min(1, queuePressure)),
    [queuePressure]
  );
  const confidenceTone = useMemo(
    () => toneFromHealth(avgConfidence || 0),
    [avgConfidence]
  );

  traceDashboardRender("DASHBOARD_RENDER", "EditorialOverview_render", {
    loading,
    hasData: Boolean(data),
  });

  const showDegraded = Boolean(error && !data);
  const showLoadingShell = Boolean(loading && !data);

  if (showDegraded) {
    return (
      <EditorialDegradedShell
        error={error ?? "Dashboard unavailable"}
        onRetry={refresh}
      />
    );
  }

  if (showLoadingShell) {
    return (
      <>
        <EditorialKpiSkeletons />
        <EditorialQuickLinks />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <EditorialKpiSkeletons count={4} />
        <EditorialQuickLinks />
      </>
    );
  }

  traceDashboardRender("CHART_DATA", "ingestion_over_time", {
    len: ingestionOverTime.length,
  });
  traceDashboardRender("CHART_DATA", "district_activity", {
    len: districtActivity.length,
  });
  traceDashboardRender("CHART_DATA", "source_reliability", {
    len: sourceReliabilityTrend.length,
  });

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}

      <section className="anr-cc-hero" style={{ marginBottom: "1.25rem" }}>
        <div className="anr-cc-hero__row">
          <div>
            <p className="anr-meta">Editorial home</p>
            <h2 className="anr-cc-hero__title">
              {pending.length} waiting · {approved.length} approved · {breaking.length} breaking
            </h2>
            <p className="anr-cc-hero__summary">
              {pending.length > 0
                ? `${pending.length} ${pending.length === 1 ? "story needs" : "stories need"} review.`
                : "No stories waiting for review right now."}
              {ingestionFailures.length > 0
                ? ` ${ingestionFailures.length} recent ingestion failure${ingestionFailures.length === 1 ? "" : "s"}.`
                : ""}
            </p>
          </div>
        </div>
      </section>

      <div className="anr-kpis">
        <MissionMetricCard
          label="Pending review"
          value={pending.length}
          trend={0}
          spark={ingestionOverTime.map((d, i) => ({ i, v: d.inserted }))}
          live
        />
        <MissionMetricCard
          label="Approved"
          value={approved.length}
          trend={5}
          spark={ingestionOverTime.map((d, i) => ({ i, v: d.inserted - d.failed }))}
        />
        <MissionMetricCard
          label="Breaking"
          value={breaking.length}
          trend={breaking.length > 0 ? 8 : 0}
          spark={aiConfRows.slice(0, 12).map((a, i) => ({ i, v: Math.round((a.ai_confidence ?? 0) * 100) }))}
        />
        <MissionMetricCard
          label="Queue pressure"
          value={Math.round(queuePressure * 100)}
          trend={queueTone === "breaking" ? -9 : queueTone === "warning" ? -2 : 4}
          spark={ingestionOverTime.map((d, i) => ({ i, v: d.failed }))}
          live
        />
      </div>

      <AdminCard title={`Stories needing attention (${pending.length || generated.slice(0, 8).length})`}>
        <StoriesTable articles={pending.length ? pending : generated.slice(0, 8)} />
      </AdminCard>

      <div className="anr-cc-actions" style={{ marginTop: "1.25rem" }}>
        <button
          type="button"
          className="av3-btn av3-btn--ghost"
          onClick={() => setShowAnalytics((v) => !v)}
        >
          {showAnalytics ? "Hide analytics details" : "See more analytics"}
        </button>
      </div>

      {showAnalytics ? (
      <>
      <NewsroomHealthStrip
        vm={newsroomHealth}
        loading={loading && !data}
      />
      <CoverageInsightsPanel
        vm={coverageInsights}
        loading={loading && !data}
      />
      <CoverageOpportunityPanel
        vm={coverageOpportunities}
        loading={loading && !data}
      />

      <div className="anr-grid anr-grid--2">
        <AdminWidgetBoundary name="Ingestion over time">
          <AdminCard title="Ingestion over time" description="Inserted vs failed articles">
            {(() => {
              traceDashboardRender("WIDGET_RENDER", "ingestion_over_time");
              return null;
            })()}
            <ClientOnly fallback={<div className="anr-skeleton" style={{ height: "220px" }} />}>
              <div className="anr-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={Array.isArray(ingestionOverTime) ? ingestionOverTime : []}>
                    <defs>
                      <linearGradient id="ingestionFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="time" tick={{ fill: "#99a1b0", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#99a1b0", fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="inserted" stroke="#2563eb" fill="url(#ingestionFill)" />
                    <Area type="monotone" dataKey="failed" stroke="#fb7185" fill="rgba(251,113,133,0.12)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ClientOnly>
          </AdminCard>
        </AdminWidgetBoundary>
        <AdminWidgetBoundary name="Approvals vs rejects">
          <AdminCard title="Approvals vs rejects" description="Publishing moderation split">
            {(() => {
              traceDashboardRender("WIDGET_RENDER", "approvals_vs_rejects");
              return null;
            })()}
            <ClientOnly fallback={<div className="anr-skeleton" style={{ height: "220px" }} />}>
              <div className="anr-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={Array.isArray(approvalsVsRejects) ? approvalsVsRejects : []}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={82}
                    >
                      {approvalsVsRejects.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ClientOnly>
          </AdminCard>
        </AdminWidgetBoundary>
      </div>

      <div className="anr-grid anr-grid--2">
        <AdminWidgetBoundary name="District activity heatmap">
          <AdminCard title="District activity heatmap" description="District publishing activity">
            {(() => {
              traceDashboardRender("WIDGET_RENDER", "district_activity");
              return null;
            })()}
            <ClientOnly fallback={<div className="anr-skeleton" style={{ height: "220px" }} />}>
              <div className="anr-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={Array.isArray(districtActivity) ? districtActivity : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="district" tick={{ fill: "#99a1b0", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#99a1b0", fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ClientOnly>
          </AdminCard>
        </AdminWidgetBoundary>
        <AdminWidgetBoundary name="Source reliability trend">
          <AdminCard title="Source reliability trend" description="Source confidence monitor">
            {(() => {
              traceDashboardRender("WIDGET_RENDER", "source_reliability");
              return null;
            })()}
            <ClientOnly fallback={<div className="anr-skeleton" style={{ height: "220px" }} />}>
              <div className="anr-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={Array.isArray(sourceReliabilityTrend) ? sourceReliabilityTrend : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="source" tick={{ fill: "#99a1b0", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#99a1b0", fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="confidence" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ClientOnly>
          </AdminCard>
        </AdminWidgetBoundary>
      </div>

      <div className="anr-grid anr-grid--3">
        <AdminCard title="Breaking story monitor" description="Red-zone stories">
          {breaking.length ? (
            <ul className="anr-pulse-list">
              {breaking.slice(0, 6).map((story) => (
                <li key={story.id} className="anr-pulse-item anr-pulse-item--breaking">
                  <strong>{story.headline}</strong>
                  <ClientTime iso={story.created_at} preset="time" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No breaking stories right now." />
          )}
        </AdminCard>
        <AdminCard title="Source health monitor" description="Provider stability">
          <div className="anr-state-grid">
            <div className="anr-state-pill anr-state-pill--stable">Stable: {sourceStable}</div>
            <div className="anr-state-pill anr-state-pill--warning">
              Warning: {sourceHealth.length - sourceStable}
            </div>
          </div>
          <ul className="anr-pulse-list">
            {sourceHealth.slice(0, 5).map((source) => (
              <li
                key={source.source_id}
                className={`anr-pulse-item ${source.healthy ? "anr-pulse-item--stable" : "anr-pulse-item--warning"}`}
              >
                <strong>{source.name}</strong>
                <span>{source.healthy ? "Healthy" : "Degraded"}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
        <AdminCard title="Queue pressure indicator" description="Urgency system">
          <div className="anr-state-grid">
            <div className={`anr-state-pill anr-state-pill--${queueTone}`}>Queue pressure</div>
            <div className={`anr-state-pill anr-state-pill--${confidenceTone}`}>AI confidence</div>
            <div className={`anr-state-pill anr-state-pill--${data.trending.breakingCount > 0 ? "breaking" : "stable"}`}>
              Breaking status
            </div>
          </div>
          <p className="anr-meta" style={{ marginTop: "0.55rem" }}>
            Pending {data.counts.pending}, AI queue {data.counts.aiQueuePending}, image queue {data.counts.imageQueuePending}
          </p>
        </AdminCard>
      </div>

      <AdminCard title="Newsroom Pulse" description="Live feed: approvals, breaking alerts, failures, AI warnings">
        {pulseFeed.length ? (
          <ul className="anr-pulse-list">
            {pulseFeed.map((item, i) => (
              <li key={`${item.at}-${i}`} className={`anr-pulse-item anr-pulse-item--${item.tone}`}>
                <strong>{item.text}</strong>
                <ClientTime iso={item.at} preset="time" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No pulse events yet." />
        )}
      </AdminCard>

      <div className="anr-grid anr-grid--2">
        <AdminCard title="Live ingestion activity" description="Fresh pipeline run diagnostics.">
          <QueueTable>
            <table className="anr-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Inserted</th>
                  <th>Fetched</th>
                  <th>Failed</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {ingestionLogs.slice(0, 6).map((log) => (
                  <tr key={log.id}>
                    <td>{log.status}</td>
                    <td>{log.inserted}</td>
                    <td>{log.total_fetched}</td>
                    <td>{log.failed_validation}</td>
                    <td>
                      <ClientTime iso={log.created_at} preset="datetime" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </QueueTable>
        </AdminCard>
        <AdminCard title="Operational widgets" description="Pending reviews, failures, image queue, top topics">
          <div className="anr-widget-grid">
            <div className="anr-widget">
              <h4>Pending reviews</h4>
              <p>{pending.length}</p>
            </div>
            <div className="anr-widget">
              <h4>Failed ingestion</h4>
              <p>{ingestionFailures.length}</p>
            </div>
            <div className="anr-widget">
              <h4>Image generation queue</h4>
              <p>{data.counts.imageQueuePending}</p>
            </div>
            <div className="anr-widget">
              <h4>Top performing topics</h4>
              <p>{data.trending.trendingSearches.slice(0, 2).join(", ") || "N/A"}</p>
            </div>
          </div>
        </AdminCard>
      </div>

      {auditTrail.length > 0 ? (
        <AdminCard
          title="Recent editorial activity"
          description="Who changed what in the newsroom"
        >
          <ul className="anr-audit-list">
            {auditTrail.map((entry) => (
              <li key={entry.id} className="anr-audit-list__item">
                <strong>{entry.action.replace(/_/g, " ")}</strong>
                <span>
                  {entry.user_email ?? "system"}
                  {entry.resource_id ? ` · ${entry.resource_id.slice(0, 8)}…` : ""}
                  {" · "}
                  {new Date(entry.created_at).toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}
      </>
      ) : null}
    </>
  );
}
