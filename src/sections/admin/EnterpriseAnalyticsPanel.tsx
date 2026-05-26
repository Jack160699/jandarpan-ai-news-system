"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnterpriseAnalyticsReport } from "@/lib/analytics/types";
import { AnalyticsPanel } from "@/sections/admin/AnalyticsPanel";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";

const POLL_MS = 12_000;
const CHART_TOOLTIP = {
  contentStyle: {
    background: "rgba(12,12,16,0.95)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    fontSize: 12,
  },
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function EnterpriseAnalyticsPanel() {
  const [deskTab, setDeskTab] = useState<"reader" | "desk">("reader");
  const [report, setReport] = useState<EnterpriseAnalyticsReport | null>(null);
  const [hours, setHours] = useState(168);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState("Weekly executive report");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/analytics/enterprise?hours=${hours}`,
        { credentials: "include", cache: "no-store" }
      );
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to load analytics");
        return;
      }
      setReport(json.report as EnterpriseAnalyticsReport);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    if (deskTab !== "reader") return;
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load, deskTab]);

  async function handleExport(format: "csv" | "json") {
    setExporting(true);
    try {
      const res = await fetch("/api/analytics/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, hours }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleSchedule() {
    const res = await fetch("/api/analytics/schedules", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: scheduleName,
        frequency: "weekly",
        format: "csv",
        windowHours: hours,
      }),
    });
    if (res.ok) {
      setScheduleOpen(false);
      load();
    }
  }

  async function removeSchedule(id: string) {
    await fetch(`/api/analytics/schedules?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    load();
  }

  if (deskTab === "desk") {
    return (
      <div className="ea">
        <div className="ea__tabs">
          <button type="button" onClick={() => setDeskTab("reader")}>
            Reader analytics
          </button>
          <button type="button" className="is-active">
            Desk metrics
          </button>
        </div>
        <AnalyticsPanel />
      </div>
    );
  }

  if (loading && !report) {
    return (
      <div className="ea">
        <div className="anr-skeleton" style={{ height: "16rem" }} />
      </div>
    );
  }

  if (error) return <EmptyState title="Analytics unavailable" hint={error} />;
  if (!report) return null;

  const s = report.summary;
  const lr = report.liveReaders;

  return (
    <div className="ea">
      <div className="ea__tabs">
        <button type="button" className="is-active">
          Reader analytics
        </button>
        <button type="button" onClick={() => setDeskTab("desk")}>
          Desk metrics
        </button>
      </div>

      <div className="ea__bar">
        <strong>ENTERPRISE ANALYTICS</strong>
        <span className="ea__live-pulse">
          {lr.activeReaders} live readers
        </span>
        <span className="anr-meta">
          {new Date(report.fetchedAt).toLocaleTimeString("en-IN")} · {POLL_MS / 1000}s refresh
        </span>
        <div className="ea__toolbar">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            aria-label="Time window"
          >
            <option value={24}>24h</option>
            <option value={72}>3d</option>
            <option value={168}>7d</option>
            <option value={720}>30d</option>
          </select>
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport("csv")}
          >
            Export CSV
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport("json")}
          >
            Export JSON
          </button>
          <button type="button" onClick={() => setScheduleOpen(true)}>
            Schedule report
          </button>
        </div>
      </div>

      <motion.div
        className="ea__kpis"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="ea__kpi ea__kpi--hot">
          <span>Live readers</span>
          <strong>{lr.activeReaders}</strong>
        </div>
        <div className="ea__kpi">
          <span>Views</span>
          <strong>{s.totalViews.toLocaleString()}</strong>
        </div>
        <div className="ea__kpi">
          <span>CTR</span>
          <strong>{pct(s.overallCtr)}</strong>
        </div>
        <div className="ea__kpi">
          <span>Retention peak</span>
          <strong>
            {pct(
              Math.max(
                ...report.audienceRetention.map((r) => r.retentionRate),
                0
              )
            )}
          </strong>
        </div>
        <div className="ea__kpi">
          <span>Scroll depth</span>
          <strong>{s.avgScrollDepth}%</strong>
        </div>
        <div className="ea__kpi">
          <span>Published</span>
          <strong>{report.productivity.articlesPublished}</strong>
        </div>
        <div className="ea__kpi">
          <span>Desk actions</span>
          <strong>{report.productivity.deskActions24h}</strong>
        </div>
        <div className="ea__kpi">
          <span>Views / min</span>
          <strong>{lr.viewsPerMinute}</strong>
        </div>
      </motion.div>

      <div className="ea__grid">
        <motion.section
          className="ea__card ea__card--wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <h3>Engagement & CTR — realtime</h3>
          <div className="ea__chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.trendSeries}>
                <defs>
                  <linearGradient id="eaViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                <Tooltip {...CHART_TOOLTIP} />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#3b82f6"
                  fill="url(#eaViews)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#8b5cf6"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Audience retention</h3>
          <div className="ea__chart ea__chart--sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.audienceRetention}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} unit="%" />
                <Tooltip {...CHART_TOOLTIP} />
                <Line
                  type="monotone"
                  dataKey="retentionRate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Scroll depth distribution</h3>
          <div className="ea__chart ea__chart--sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.scrollDepth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="bucket" tick={{ fill: "#71717a", fontSize: 10 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section className="ea__card ea__card--wide" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Article ranking engine</h3>
          <div className="ea__table-wrap">
            <table className="ea__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Headline</th>
                  <th>Score</th>
                  <th>Views</th>
                  <th>CTR</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {report.rankedArticles.slice(0, 12).map((a) => (
                  <tr key={a.slug}>
                    <td>
                      <span
                        className={`ea__rank ${a.rank === 1 ? "ea__rank--1" : ""}`}
                      >
                        {a.rank}
                      </span>
                    </td>
                    <td>{a.headline.slice(0, 56)}</td>
                    <td>{a.rankScore}</td>
                    <td>{a.views}</td>
                    <td>{pct(a.ctr)}</td>
                    <td>{a.engagementScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>District engagement</h3>
          <div className="ea__heatmap">
            {report.districtEngagement.map((d) => (
              <div
                key={d.district}
                className="ea__heat-cell"
                style={{
                  opacity: 0.4 + (d.views / Math.max(report.districtEngagement[0]?.views ?? 1, 1)) * 0.6,
                }}
              >
                {d.district}
                <strong>{d.views}</strong>
                <span>{pct(d.ctr)} CTR</span>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Topic heatmap</h3>
          <div className="ea__topic-cloud">
            {report.topicHeatmap.map((t) => (
              <span
                key={t.topic}
                className="ea__topic-pill"
                style={{ opacity: 0.35 + (t.intensity / 100) * 0.65 }}
              >
                {t.topic} {t.intensity}%
              </span>
            ))}
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>SEO rankings</h3>
          <div className="ea__table-wrap">
            <table className="ea__table">
              <thead>
                <tr>
                  <th>Story</th>
                  <th>SEO</th>
                  <th>Views</th>
                  <th>Est. pos</th>
                </tr>
              </thead>
              <tbody>
                {report.seoRankings.slice(0, 8).map((r) => (
                  <tr key={r.slug}>
                    <td>{r.headline.slice(0, 40)}…</td>
                    <td>{pct(r.seoScore)}</td>
                    <td>{r.organicViews}</td>
                    <td>#{r.positionEstimate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>CTR by surface</h3>
          <div className="ea__chart ea__chart--sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.ctrAnalytics.bySurface}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="surface" tick={{ fill: "#71717a", fontSize: 9 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="ctr" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Source performance</h3>
          <div className="ea__table-wrap">
            <table className="ea__table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Views</th>
                  <th>Trust</th>
                </tr>
              </thead>
              <tbody>
                {report.sourcePerformance.map((sp) => (
                  <tr key={sp.sourceKey}>
                    <td>{sp.sourceName}</td>
                    <td>{sp.views}</td>
                    <td>{pct(sp.avgTrust)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Publishing velocity</h3>
          <div className="ea__chart ea__chart--sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.publishingVelocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="published" fill="#22c55e" stackId="a" />
                <Bar dataKey="drafted" fill="#71717a" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>AI confidence trends</h3>
          <div className="ea__chart ea__chart--sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.aiConfidenceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} domain={[0, 1]} />
                <Tooltip {...CHART_TOOLTIP} />
                <Line
                  type="monotone"
                  dataKey="avgConfidence"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section className="ea__card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Admin insights</h3>
          <ul className="ea__insights">
            {report.adminInsights.map((i) => (
              <li key={i.id} data-severity={i.severity}>
                <strong>{i.title}</strong>
                {i.detail}
              </li>
            ))}
          </ul>
          {report.scheduledReports.length > 0 ? (
            <>
              <h3 style={{ marginTop: "1rem" }}>Scheduled reports</h3>
              <ul className="ea__schedule-list">
                {report.scheduledReports.map((sch) => (
                  <li key={sch.id}>
                    <span>
                      {sch.name} · {sch.frequency} · {sch.format}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSchedule(sch.id)}
                      aria-label={`Remove ${sch.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </motion.section>
      </div>

      {scheduleOpen ? (
        <div className="ea__modal-backdrop" role="dialog" aria-modal="true">
          <div className="ea__modal">
            <h3 style={{ margin: 0 }}>Schedule report</h3>
            <label htmlFor="ea-schedule-name">Report name</label>
            <input
              id="ea-schedule-name"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
            />
            <p className="anr-meta" style={{ marginTop: "0.75rem" }}>
              Weekly CSV export · {hours}h window. Email delivery requires cron worker.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" className="anr-btn" onClick={handleSchedule}>
                Save schedule
              </button>
              <button
                type="button"
                className="anr-btn anr-btn--ghost"
                onClick={() => setScheduleOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
