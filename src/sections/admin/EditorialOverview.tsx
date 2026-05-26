"use client";

import { useEffect, useMemo, useState } from "react";
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
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { useHasMounted } from "@/hooks/useHasMounted";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import { QueueTable } from "@/components/admin-newsroom/ui/QueueTable";

function useAnimatedNumber(value: number, durationMs = 700) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = display;
    function step(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplay(from + (value - from) * progress);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

function toneFromHealth(score: number): "stable" | "warning" | "breaking" {
  if (score >= 0.75) return "stable";
  if (score >= 0.45) return "warning";
  return "breaking";
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
          <AreaChart data={spark}>
            <Area
              type="monotone"
              dataKey="v"
              stroke="#f59e0b"
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
  const { data, loading, error } = useAdminNewsroom();
  const mounted = useHasMounted();

  if (loading && !data) {
    return (
      <div className="anr-kpis">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="anr-kpi">
            <div className="anr-skeleton" style={{ height: "2.5rem" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    if (error) {
      return (
        <EmptyState
          title="Editorial data unavailable"
          hint={error}
        />
      );
    }
    return null;
  }

  const pending = data.generatedArticles.filter((a) => a.editorial_status === "pending");
  const approved = data.generatedArticles.filter((a) => a.editorial_status === "approved");
  const rejected = data.generatedArticles.filter((a) => a.editorial_status === "rejected");
  const breaking = data.generatedArticles.filter((a) => a.is_breaking);
  const aiConfRows = data.generatedArticles.filter((a) => a.ai_confidence != null);
  const avgConfidence =
    aiConfRows.reduce((sum, a) => sum + (a.ai_confidence ?? 0), 0) /
    Math.max(1, aiConfRows.length);

  const ingestionOverTime = useMemo(() => {
    if (!mounted) return [];
    return data.ingestion.recentLogs
      .slice(0, 12)
      .reverse()
      .map((log) => ({
        time: new Date(log.created_at).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        inserted: log.inserted,
        failed: log.failed_validation,
      }));
  }, [mounted, data.ingestion.recentLogs]);

  const approvalsVsRejects = [
    { name: "Approved", value: approved.length, color: "#22c55e" },
    { name: "Rejected", value: rejected.length, color: "#fb7185" },
    { name: "Pending", value: pending.length, color: "#f59e0b" },
  ];

  const districtActivity = Object.entries(
    data.generatedArticles.reduce<Record<string, number>>((acc, article) => {
      const district = article.source_attribution[0]?.source ?? "General";
      acc[district] = (acc[district] ?? 0) + 1;
      return acc;
    }, {})
  )
    .slice(0, 8)
    .map(([district, count]) => ({ district, count }));

  const sourceReliabilityTrend = data.sourceReliability
    .slice(0, 8)
    .map((s) => ({ source: s.source.slice(0, 12), confidence: Math.round(s.avgConfidence * 100) }));

  const pulseFeed = [
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
    ...data.ingestion.recentFailures.slice(0, 3).map((f) => ({
      tone: "warning",
      text: `Ingestion failure: ${f.title ?? "Untitled"} (${f.reason})`,
      at: f.created_at,
    })),
    ...data.aiQueue
      .filter((q) => q.error)
      .slice(0, 3)
      .map((q) => ({
        tone: "warning",
        text: `AI moderation warning: ${q.error}`,
        at: q.created_at,
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12);

  const sourceStable = data.sourceHealth.filter((s) => s.healthy).length;
  const queuePressure =
    (data.counts.pending + data.counts.aiQueuePending + data.counts.imageQueuePending) /
    Math.max(1, data.counts.generated);
  const queueTone = toneFromHealth(1 - Math.min(1, queuePressure));
  const confidenceTone = toneFromHealth(avgConfidence || 0);

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}
      <div className="anr-kpis">
        <MissionMetricCard
          label="Live ingestion activity"
          value={data.counts.signals}
          trend={8}
          spark={ingestionOverTime.map((d, i) => ({ i, v: d.inserted }))}
          live
        />
        <MissionMetricCard
          label="Publishing velocity"
          value={approved.length}
          trend={5}
          spark={ingestionOverTime.map((d, i) => ({ i, v: d.inserted - d.failed }))}
        />
        <MissionMetricCard
          label="AI confidence trend"
          value={Math.round(avgConfidence * 100)}
          trend={3}
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

      <div className="anr-grid anr-grid--2">
        <AdminCard title="Ingestion over time" description="Inserted vs failed articles">
          <div className="anr-chart">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ingestionOverTime}>
                <defs>
                  <linearGradient id="ingestionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="time" tick={{ fill: "#99a1b0", fontSize: 11 }} />
                <YAxis tick={{ fill: "#99a1b0", fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="inserted" stroke="#f59e0b" fill="url(#ingestionFill)" />
                <Area type="monotone" dataKey="failed" stroke="#fb7185" fill="rgba(251,113,133,0.12)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
        <AdminCard title="Approvals vs rejects" description="Publishing moderation split">
          <div className="anr-chart">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={approvalsVsRejects} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82}>
                  {approvalsVsRejects.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      <div className="anr-grid anr-grid--2">
        <AdminCard title="District activity heatmap" description="District publishing activity">
          <div className="anr-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={districtActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="district" tick={{ fill: "#99a1b0", fontSize: 11 }} />
                <YAxis tick={{ fill: "#99a1b0", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
        <AdminCard title="Source reliability trend" description="Source confidence monitor">
          <div className="anr-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sourceReliabilityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="source" tick={{ fill: "#99a1b0", fontSize: 11 }} />
                <YAxis tick={{ fill: "#99a1b0", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="confidence" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
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
              Warning: {data.sourceHealth.length - sourceStable}
            </div>
          </div>
          <ul className="anr-pulse-list">
            {data.sourceHealth.slice(0, 5).map((source) => (
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
                {data.ingestion.recentLogs.slice(0, 6).map((log) => (
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
              <p>{data.ingestion.recentFailures.length}</p>
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

      <AdminCard title={`Pending review (${pending.length})`} />
      <StoriesTable articles={pending.length ? pending : data.generatedArticles.slice(0, 8)} />
    </>
  );
}
