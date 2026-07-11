"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import type {
  CompetitorArticleListItem,
  CompetitorDashboardStats,
  CompetitorSourceRow,
} from "@/lib/competitor-intelligence/types";

type DashboardPayload = {
  ok: boolean;
  enabled: boolean;
  stats: CompetitorDashboardStats;
  sources: CompetitorSourceRow[];
};

type LatestPayload = {
  ok: boolean;
  articles: CompetitorArticleListItem[];
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function CompetitorIntelligencePanel() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [articles, setArticles] = useState<CompetitorArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [dashRes, latestRes] = await Promise.all([
        fetch("/api/admin/seo/competitors", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/admin/seo/competitors/latest?limit=50", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const dashJson = (await dashRes.json()) as DashboardPayload & {
        error?: string;
      };
      const latestJson = (await latestRes.json()) as LatestPayload & {
        error?: string;
      };

      if (!dashRes.ok || !dashJson.ok) {
        setError(dashJson.error ?? "Failed to load competitor dashboard");
        return;
      }
      if (!latestRes.ok || !latestJson.ok) {
        setError(latestJson.error ?? "Failed to load competitor articles");
        return;
      }

      setDashboard(dashJson);
      setArticles(latestJson.articles);
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
    return <EmptyState title="Competitor intelligence offline" hint={error} />;
  }

  if (!dashboard) return null;

  const { stats, sources, enabled } = dashboard;

  return (
    <div className="anr-icenter">
      <header className="anr-icenter__terminal-bar">
        <div className="anr-icenter__brand">
          <span className="anr-icenter__dot" />
          <strong>SEO INTEL</strong>
          <em>COMPETITOR TRACKER</em>
        </div>
        <LiveIndicator label={enabled ? "Tracker enabled" : "Tracker disabled"} />
        {stats.latestCrawl?.startedAt ? (
          <span className="anr-icenter__clock">
            Last crawl{" "}
            <ClientTime iso={stats.latestCrawl.startedAt} preset="datetime" />
          </span>
        ) : null}
      </header>

      {!enabled ? (
        <AdminCard title="Feature flag" className="anr-icenter__card">
          <p className="anr-meta">
            Set <code>SEO_COMPETITOR_TRACKER=true</code> on Vercel to enable the
            30-minute crawl scheduler.
          </p>
        </AdminCard>
      ) : null}

      <div className="anr-kpis anr-icenter__kpis">
        <article className="anr-kpi anr-icenter__kpi">
          <span>Competitors</span>
          <strong>{stats.competitorsMonitored}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Total articles</span>
          <strong>{stats.totalArticles}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>New today</span>
          <strong>{stats.newArticlesToday}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Failed crawls (24h)</span>
          <strong className="anr-kpi--warn">{stats.failedCrawls24h}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Crawl duration</span>
          <strong>{formatDuration(stats.latestCrawl?.durationMs ?? null)}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Latest status</span>
          <strong>{stats.latestCrawl?.status ?? "—"}</strong>
        </article>
      </div>

      <div className="anr-icenter__layout">
        <AdminCard title="Monitored competitors" className="anr-icenter__card">
          <ul className="anr-icenter__list">
            {sources.map((source) => (
              <li key={source.id}>
                <strong>{source.name}</strong>
                <span>
                  {source.enabled ? "enabled" : "disabled"} · {source.region} ·{" "}
                  {source.language}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Latest crawl" className="anr-icenter__card">
          {stats.latestCrawl ? (
            <ul className="anr-icenter__list">
              <li>
                <strong>Found</strong>
                <span>{stats.latestCrawl.articlesFound} articles</span>
              </li>
              <li>
                <strong>Saved</strong>
                <span>{stats.latestCrawl.articlesSaved} articles</span>
              </li>
              <li>
                <strong>Errors</strong>
                <span>{stats.latestCrawl.errors.length}</span>
              </li>
            </ul>
          ) : (
            <p className="anr-meta">No crawl runs recorded yet.</p>
          )}
        </AdminCard>
      </div>

      <AdminCard title="Collected articles" className="anr-icenter__card">
        {articles.length === 0 ? (
          <EmptyState
            title="No competitor articles yet"
            hint="Enable the tracker and wait for the first scheduled crawl."
          />
        ) : (
          <div className="anr-table-wrap">
            <table className="anr-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Headline</th>
                  <th>District</th>
                  <th>Category</th>
                  <th>Published</th>
                  <th>Fetched</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id}>
                    <td>{article.source_name}</td>
                    <td>{article.title}</td>
                    <td>{article.district ?? "—"}</td>
                    <td>{article.category ?? "—"}</td>
                    <td>
                      {article.published_at ? (
                        <ClientTime iso={article.published_at} preset="datetime" />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <ClientTime iso={article.fetched_at} preset="datetime" />
                    </td>
                    <td>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="anr-link"
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
