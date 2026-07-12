"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import type { GscDashboard } from "@/lib/gsc-intelligence/types";

type GscPayload = {
  ok: boolean;
  enabled: boolean;
  credentialsConfigured: boolean;
  dashboard: GscDashboard;
};

export function GscIntelligencePanel() {
  const [dashboard, setDashboard] = useState<GscDashboard | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo/search-console", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as GscPayload & { error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load Search Console data");
        return;
      }
      setDashboard(json.dashboard);
      setEnabled(json.enabled);
      setCredentialsConfigured(json.credentialsConfigured);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    const id = setInterval(() => {
      void refresh();
    }, 60_000);
    return () => {
      clearTimeout(timer);
      clearInterval(id);
    };
  }, [refresh]);

  if (loading && !dashboard) {
    return (
      <div className="anr-icenter">
        <div className="anr-skeleton" style={{ height: "14rem" }} />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Search Console offline" hint={error} />;
  }

  if (!dashboard) return null;

  const chartData = dashboard.growthCharts.map((d) => ({
    date: d.metric_date.slice(5),
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  return (
    <div className="anr-icenter">
      <header className="anr-icenter__terminal-bar">
        <div className="anr-icenter__brand">
          <span className="anr-icenter__dot" />
          <strong>GOOGLE</strong>
          <em>SEARCH CONSOLE</em>
        </div>
        <LiveIndicator
          label={
            enabled && credentialsConfigured
              ? "GSC sync active"
              : enabled
                ? "Credentials needed"
                : "Engine disabled"
          }
        />
        {dashboard.lastSyncAt ? (
          <span className="anr-icenter__clock">
            Last sync{" "}
            <ClientTime iso={dashboard.lastSyncAt} preset="datetime" />
          </span>
        ) : null}
      </header>

      {(!enabled || !credentialsConfigured) && (
        <AdminCard title="Setup" className="anr-icenter__card">
          <p className="anr-meta">
            Set <code>SEO_GSC_ENGINE=true</code> and configure{" "}
            <code>GSC_SERVICE_ACCOUNT_JSON</code> (preferred) or{" "}
            <code>GSC_REFRESH_TOKEN</code> + Google OAuth credentials. Add the
            service account as a user in Search Console. Runs once daily.
          </p>
        </AdminCard>
      )}

      <div className="anr-kpis anr-icenter__kpis">
        <article className="anr-kpi anr-icenter__kpi">
          <span>Clicks (28d)</span>
          <strong>{dashboard.clicks.toLocaleString()}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Impressions</span>
          <strong>{dashboard.impressions.toLocaleString()}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>CTR</span>
          <strong>{dashboard.ctr}%</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Avg Position</span>
          <strong>{dashboard.averagePosition}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>7d Δ Clicks</span>
          <strong
            className={
              dashboard.trends.days7.clicks_delta >= 0
                ? undefined
                : "anr-kpi--warn"
            }
          >
            {dashboard.trends.days7.clicks_delta >= 0 ? "+" : ""}
            {dashboard.trends.days7.clicks_delta}
          </strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Opportunities</span>
          <strong className="anr-kpi--warn">
            {dashboard.ctrOpportunities.length}
          </strong>
        </article>
      </div>

      <AdminCard title="Growth charts" className="anr-icenter__card">
        {chartData.length === 0 ? (
          <p className="anr-meta">No daily metrics yet — run the GSC sync.</p>
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </AdminCard>

      <div className="anr-icenter__layout">
        <AdminCard title="Top queries" className="anr-icenter__card">
          {dashboard.topQueries.length === 0 ? (
            <p className="anr-meta">No query data yet.</p>
          ) : (
            <ul className="anr-icenter__list">
              {dashboard.topQueries.slice(0, 12).map((q) => (
                <li key={q.query}>
                  <strong>{q.query}</strong>
                  <span>
                    {q.clicks} clicks · {q.impressions} imp · {q.ctr}% CTR · #
                    {q.position} · {q.trend}
                    {q.district ? ` · ${q.district}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Top pages" className="anr-icenter__card">
          {dashboard.topPages.length === 0 ? (
            <p className="anr-meta">No page data yet.</p>
          ) : (
            <ul className="anr-icenter__list">
              {dashboard.topPages.slice(0, 10).map((p) => (
                <li key={p.page_url}>
                  <strong>{p.generated_article_slug ?? p.page_url}</strong>
                  <span>
                    {p.clicks} clicks · {p.ctr}% CTR · #{p.position} ·{" "}
                    {p.indexed_status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <AdminCard title="Index health" className="anr-icenter__card">
        {!dashboard.indexHealth ? (
          <p className="anr-meta">No index health snapshot yet.</p>
        ) : (
          <ul className="anr-icenter__list">
            <li>
              <strong>Indexed pages (estimate)</strong>
              <span>{dashboard.indexHealth.indexed_pages}</span>
            </li>
            <li>
              <strong>Sitemap health</strong>
              <span>{dashboard.indexHealth.sitemap_health}</span>
            </li>
            <li>
              <strong>News sitemap</strong>
              <span>{dashboard.indexHealth.news_sitemap_health}</span>
            </li>
            <li>
              <strong>Errors / Warnings</strong>
              <span>
                {dashboard.indexHealth.errors} / {dashboard.indexHealth.warnings}
              </span>
            </li>
          </ul>
        )}
      </AdminCard>

      <div className="anr-icenter__layout">
        <AdminCard title="Top winners" className="anr-icenter__card">
          <ul className="anr-icenter__list">
            {dashboard.executiveReport.topWinners.slice(0, 8).map((w) => (
              <li key={w.query}>
                <strong>{w.query}</strong>
                <span>+{w.position_delta} positions</span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Top losers" className="anr-icenter__card">
          <ul className="anr-icenter__list">
            {dashboard.executiveReport.topLosers.slice(0, 8).map((l) => (
              <li key={l.query}>
                <strong>{l.query}</strong>
                <span>{l.position_delta} positions</span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>

      <AdminCard title="CTR opportunities" className="anr-icenter__card">
        {dashboard.ctrOpportunities.length === 0 ? (
          <EmptyState
            title="No opportunities yet"
            hint="Recommendations appear after the first GSC sync."
          />
        ) : (
          <ul className="anr-icenter__list">
            {dashboard.ctrOpportunities.map((rec, idx) => (
              <li key={`${rec.title}-${idx}`} data-priority={rec.priority}>
                <strong>
                  [{rec.priority}] {rec.title}
                </strong>
                <span>{rec.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <div className="anr-icenter__layout">
        <AdminCard title="District trends" className="anr-icenter__card">
          <ul className="anr-icenter__list">
            {dashboard.districtTrends.map((d) => (
              <li key={d.district}>
                <strong>{d.district}</strong>
                <span>
                  {d.clicks} clicks · {d.trend}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Category trends" className="anr-icenter__card">
          <ul className="anr-icenter__list">
            {dashboard.categoryTrends.map((c) => (
              <li key={c.category}>
                <strong>{c.category}</strong>
                <span>
                  {c.clicks} clicks · {c.trend}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
    </div>
  );
}
