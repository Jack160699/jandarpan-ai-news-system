"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendChart } from "@/components/analytics/TrendChart";
import type { NewsroomAnalyticsReport } from "@/lib/analytics/types";

const POLL_MS = 15_000;

export function NewsroomAnalyticsPanel() {
  const [report, setReport] = useState<NewsroomAnalyticsReport | null>(null);
  const [hours, setHours] = useState(168);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/dashboard?hours=${hours}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to load analytics");
        return;
      }
      setReport(json.report as NewsroomAnalyticsReport);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !report) {
    return <div className="anr-skeleton" style={{ height: "12rem" }} />;
  }

  if (error) return <p className="anr-error">{error}</p>;
  if (!report) return null;

  const s = report.summary;

  return (
    <div className="anr-stack">
      <div className="anr-toolbar">
        <span className="nra-live-dot">
          <span className="anr-live-dot" aria-hidden />
          Live · 15s refresh
        </span>
        <select
          className="anr-input"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          <option value={24}>Last 24 hours</option>
          <option value={72}>Last 3 days</option>
          <option value={168}>Last 7 days</option>
          <option value={720}>Last 30 days</option>
        </select>
      </div>

      <p className="nra-privacy">{report.privacyNote}</p>

      <div className="nra-kpi-grid">
        <div className="nra-kpi">
          <div className="nra-kpi__value">{s.totalViews.toLocaleString()}</div>
          <div className="nra-kpi__label">Article views</div>
        </div>
        <div className="nra-kpi">
          <div className="nra-kpi__value">
            {(s.overallCtr * 100).toFixed(1)}%
          </div>
          <div className="nra-kpi__label">CTR</div>
        </div>
        <div className="nra-kpi">
          <div className="nra-kpi__value">{s.avgReadTimeSec}s</div>
          <div className="nra-kpi__label">Avg read time</div>
        </div>
        <div className="nra-kpi">
          <div className="nra-kpi__value">{s.avgScrollDepth}%</div>
          <div className="nra-kpi__label">Scroll depth</div>
        </div>
        <div className="nra-kpi">
          <div className="nra-kpi__value">{s.engagedSessions}</div>
          <div className="nra-kpi__label">Deep reads (50%+)</div>
        </div>
        <div className="nra-kpi">
          <div className="nra-kpi__value">{s.breakingVelocityPeak}</div>
          <div className="nra-kpi__label">Breaking velocity peak</div>
        </div>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">Engagement trend</div>
        <TrendChart series={report.trendSeries} />
        <p className="anr-meta">Orange = views · Blue = clicks</p>
      </div>

      <div className="anr-grid anr-grid--2">
        <div className="anr-card">
          <div className="anr-card__head">Regional heatmap</div>
          <div className="nra-heatmap">
            {report.regionalHeatmap.map((r) => (
              <div
                key={r.region}
                className="nra-heatmap__cell"
                style={{
                  background: `color-mix(in srgb, var(--anr-accent) ${r.heat}%, transparent)`,
                }}
              >
                <strong>{r.region}</strong>
                {r.views} views · {r.heat}% heat
              </div>
            ))}
            {!report.regionalHeatmap.length ? (
              <p className="anr-meta">No regional data yet</p>
            ) : null}
          </div>
        </div>

        <div className="anr-card">
          <div className="anr-card__head">Topic heatmap</div>
          <div className="nra-topic-grid">
            {report.topicHeatmap.map((t) => (
              <span
                key={t.topic}
                className="nra-topic-pill"
                style={{
                  opacity: 0.4 + (t.intensity / 100) * 0.6,
                  fontWeight: t.intensity > 60 ? 600 : 400,
                }}
                title={`${t.count} views · engagement ${t.avgEngagement}`}
              >
                {t.topic} ({t.intensity}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">Breaking-news velocity</div>
        <ul className="nra-velocity-list">
          {report.breakingVelocity.map((b) => (
            <li key={b.slug}>
              <span>
                {b.headline}
                {b.isBreaking ? " · LIVE" : ""}
              </span>
              <span>
                {b.views1h}/hr · score {b.velocityScore}
              </span>
            </li>
          ))}
          {!report.breakingVelocity.length ? (
            <li className="anr-meta">No velocity spikes recorded</li>
          ) : null}
        </ul>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">Category intelligence</div>
        <div className="anr-table-wrap">
          <table className="anr-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Articles</th>
                <th>Views</th>
                <th>CTR</th>
                <th>Avg scroll</th>
                <th>Traffic share</th>
              </tr>
            </thead>
            <tbody>
              {report.categoryIntelligence.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{c.articles}</td>
                  <td>{c.views}</td>
                  <td>{(c.ctr * 100).toFixed(1)}%</td>
                  <td>{c.avgScroll}%</td>
                  <td>{c.shareOfTraffic}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">Top performing stories</div>
        <div className="anr-table-wrap">
          <table className="anr-table">
            <thead>
              <tr>
                <th>Headline</th>
                <th>Views</th>
                <th>CTR</th>
                <th>Read</th>
                <th>Scroll</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {report.topArticles.map((a) => (
                <tr key={a.slug}>
                  <td>{a.headline}</td>
                  <td>{a.views}</td>
                  <td>{(a.ctr * 100).toFixed(1)}%</td>
                  <td>{a.avgDwellSec}s</td>
                  <td>{a.avgScrollDepth}%</td>
                  <td>{a.engagementScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">AI story performance</div>
        <div className="anr-table-wrap">
          <table className="anr-table">
            <thead>
              <tr>
                <th>Headline</th>
                <th>AI confidence</th>
                <th>Engagement</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {report.aiLeaders.map((a) => (
                <tr key={a.slug}>
                  <td>{a.headline}</td>
                  <td>
                    {a.aiConfidence != null
                      ? `${Math.round(a.aiConfidence * 100)}%`
                      : "—"}
                  </td>
                  <td>{a.engagementScore}</td>
                  <td>{a.views}</td>
                </tr>
              ))}
              {!report.aiLeaders.length ? (
                <tr>
                  <td colSpan={4} className="anr-meta">
                    No AI confidence metadata on articles
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
