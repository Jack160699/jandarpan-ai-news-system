"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NewsroomIntelligenceSnapshot } from "@/lib/intelligence/types";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

export function IntelligenceMissionPanel() {
  const [data, setData] = useState<NewsroomIntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/editorial/intelligence", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load intelligence");
        return;
      }
      const { ok: _ok, ...snapshot } = json;
      setData(snapshot as NewsroomIntelligenceSnapshot);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading && !data) {
    return (
      <div className="anr-intel">
        <div className="anr-skeleton" style={{ height: "12rem" }} />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Intelligence offline" description={error} />;
  }

  if (!data) return null;

  const heatData = data.districtHeatmap.slice(0, 8).map((d) => ({
    name: d.districtName,
    intensity: Math.round(d.intensity * 100),
    breaking: d.breakingCount,
  }));

  return (
    <div className="anr-intel">
      <div className="anr-intel__header">
        <LiveIndicator label="Intelligence live" />
        <span className="anr-meta">
          Updated {new Date(data.fetchedAt).toLocaleTimeString("en-IN")}
        </span>
      </div>

      <div className="anr-kpis anr-intel__kpis">
        <article className="anr-kpi">
          <span>Articles analyzed</span>
          <strong>{data.summary.articlesAnalyzed}</strong>
        </article>
        <article className="anr-kpi">
          <span>High misinfo risk</span>
          <strong className="anr-kpi--warn">{data.summary.highRiskCount}</strong>
        </article>
        <article className="anr-kpi">
          <span>Breaking candidates</span>
          <strong>{data.summary.breakingCandidates}</strong>
        </article>
        <article className="anr-kpi">
          <span>Duplicate clusters</span>
          <strong>{data.summary.duplicateClusters}</strong>
        </article>
        <article className="anr-kpi">
          <span>Avg trust</span>
          <strong>{Math.round(data.summary.avgTrustScore * 100)}%</strong>
        </article>
        <article className="anr-kpi">
          <span>Avg viral potential</span>
          <strong>{Math.round(data.summary.avgViralScore * 100)}%</strong>
        </article>
      </div>

      <div className="anr-intel__grid">
        <AdminCard title="Editorial recommendations" className="anr-intel__card">
          <ul className="anr-intel__recs">
            {data.recommendations.length === 0 ? (
              <li className="anr-meta">No urgent actions</li>
            ) : (
              data.recommendations.map((r) => (
                <li key={r.id} data-priority={r.priority}>
                  <strong>{r.action}</strong>
                  <span>{r.reason}</span>
                </li>
              ))
            )}
          </ul>
        </AdminCard>

        <AdminCard title="Fake news risk watch" className="anr-intel__card">
          <ul className="anr-intel__risks">
            {data.topRisks.length === 0 ? (
              <li className="anr-meta">No high-risk stories</li>
            ) : (
              data.topRisks.map((r) => (
                <li key={r.articleId}>
                  <span
                    className="anr-intel__badge"
                    style={{ background: RISK_COLORS[r.level] }}
                  >
                    {r.level}
                  </span>
                  <div>
                    <strong>{r.headline.slice(0, 72)}</strong>
                    <span>{r.recommendation}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </AdminCard>

        <AdminCard title="District trend heatmap" className="anr-intel__card anr-intel__card--wide">
          {heatData.length === 0 ? (
            <p className="anr-meta">No district signals in window</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={heatData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                  }}
                />
                <Bar dataKey="intensity" name="Intensity %" radius={[4, 4, 0, 0]}>
                  {heatData.map((_, i) => (
                    <Cell key={i} fill={`rgba(245,158,11,${0.35 + (i % 5) * 0.12})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminCard>

        <AdminCard title="Topic momentum" className="anr-intel__card">
          <ul className="anr-intel__momentum">
            {data.topicMomentum.slice(0, 8).map((t) => (
              <li key={t.topicKey}>
                <span>{t.label}</span>
                <div className="anr-intel__bar">
                  <div style={{ width: `${Math.round(t.momentum * 100)}%` }} />
                </div>
                <em>{t.velocity}/hr</em>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Viral predictions" className="anr-intel__card">
          <ul className="anr-intel__viral">
            {data.viralPredictions.slice(0, 6).map((v) => (
              <li key={v.articleId}>
                <strong>{Math.round(v.viralScore * 100)}%</strong>
                <span>{v.headline.slice(0, 56)}…</span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Source trust engine" className="anr-intel__card">
          <ul className="anr-intel__trust">
            {data.sourceTrust.slice(0, 8).map((s) => (
              <li key={s.sourceId}>
                <span>{s.sourceName}</span>
                <em data-tier={s.tier}>{Math.round(s.trustScore * 100)}%</em>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Duplicate detection" className="anr-intel__card">
          <ul className="anr-intel__dupes">
            {data.duplicates.length === 0 ? (
              <li className="anr-meta">No clusters</li>
            ) : (
              data.duplicates.slice(0, 6).map((d) => (
                <li key={d.clusterId}>
                  <strong>{Math.round(d.similarity * 100)}% match</strong>
                  <span>{d.headline.slice(0, 50)}…</span>
                </li>
              ))
            )}
          </ul>
        </AdminCard>

        <AdminCard title="Event clusters" className="anr-intel__card">
          <ul className="anr-intel__events">
            {data.eventClusters.slice(0, 6).map((e) => (
              <li key={e.eventId}>
                <strong>{e.canonicalTitle.slice(0, 48)}</strong>
                <span>
                  {e.signalCount} signals · urgency {Math.round(e.urgencyScore * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Trend forecast (24h)" className="anr-intel__card">
          <ul className="anr-intel__forecast">
            {data.trendForecasts.slice(0, 6).map((t) => (
              <li key={t.topic} data-direction={t.direction}>
                <span>{t.topic}</span>
                <em>{t.direction}</em>
                <strong>{Math.round(t.forecast24h * 100)}%</strong>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Breaking news detector" className="anr-intel__card">
          <ul className="anr-intel__breaking">
            {data.breakingCandidates.slice(0, 6).map((b) => (
              <li key={b.articleId}>
                <strong>{Math.round(b.breakingScore * 100)}%</strong>
                <span>{b.headline.slice(0, 52)}…</span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="SEO opportunities" className="anr-intel__card">
          <ul className="anr-intel__seo">
            {data.seoOpportunities.slice(0, 6).map((s) => (
              <li key={s.articleId}>
                <strong>{s.suggestedAction}</strong>
                <span>{s.gap}</span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Multilingual pipeline" className="anr-intel__card">
          <p className="anr-meta">
            {data.multilingual.enabled ? "OpenAI enabled" : "Configure OPENAI_API_KEY"}
          </p>
          <p>
            Targets: {data.multilingual.targetLanguages.join(", ")}
          </p>
          <p>
            Complete: {data.multilingual.completedCount} · Pending:{" "}
            {data.multilingual.pendingCount}
          </p>
        </AdminCard>
      </div>
    </div>
  );
}
