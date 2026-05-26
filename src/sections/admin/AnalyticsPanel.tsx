"use client";

import { ConfidenceBadge } from "@/components/admin-newsroom/ConfidenceBadge";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { MetricCard } from "@/components/admin-newsroom/ui/MetricCard";
import { QueueTable } from "@/components/admin-newsroom/ui/QueueTable";

export function AnalyticsPanel() {
  const { data, loading, error } = useAdminNewsroom();

  if (loading && !data) {
    return <div className="anr-skeleton" style={{ height: "16rem" }} />;
  }
  if (!data) return null;

  const avgConf =
    data.generatedArticles.filter((a) => a.ai_confidence != null).length > 0
      ? data.generatedArticles.reduce(
          (s, a) => s + (a.ai_confidence ?? 0),
          0
        ) /
        data.generatedArticles.filter((a) => a.ai_confidence != null).length
      : 0;

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}
      <div className="anr-kpis">
        <MetricCard label="Avg confidence" value={`${Math.round(avgConf * 100)}%`} />
        <MetricCard label="Ranking avg" value={`${Math.round(data.trending.rankingAvg * 100)}%`} />
        <MetricCard label="Breaking marked" value={data.trending.breakingCount} />
        <MetricCard label="Generated" value={data.counts.generated} />
      </div>

      <AdminCard title="Top headlines by confidence">
        <ul style={{ margin: 0, padding: "0.75rem 1rem", listStyle: "none" }}>
          {data.trending.topHeadlines.map((item, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.4rem 0",
                borderBottom: "1px solid var(--anr-border)",
                fontSize: "0.8125rem",
              }}
            >
              <span>{item.headline}</span>
              <ConfidenceBadge score={item.score} />
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminCard title="Source reliability">
        <QueueTable>
          <table className="anr-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Provider</th>
                <th>Avg confidence</th>
                <th>Articles</th>
              </tr>
            </thead>
            <tbody>
              {data.sourceReliability.map((row, i) => (
                <tr key={i}>
                  <td>{row.source}</td>
                  <td>{row.provider}</td>
                  <td>
                    <ConfidenceBadge score={row.avgConfidence} />
                  </td>
                  <td>{row.articleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </QueueTable>
      </AdminCard>

      <AdminCard title="Trending searches">
        <p style={{ padding: "0.75rem 1rem", margin: 0, fontSize: "0.8125rem" }}>
          {data.trending.trendingSearches.join(" · ") || "—"}
        </p>
      </AdminCard>
    </>
  );
}
