"use client";

import { ConfidenceBadge } from "@/components/admin-newsroom/ConfidenceBadge";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";

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
        <div className="anr-kpi">
          <span>Avg confidence</span>
          <strong>{Math.round(avgConf * 100)}%</strong>
        </div>
        <div className="anr-kpi">
          <span>Ranking avg</span>
          <strong>{Math.round(data.trending.rankingAvg * 100)}%</strong>
        </div>
        <div className="anr-kpi">
          <span>Breaking marked</span>
          <strong>{data.trending.breakingCount}</strong>
        </div>
        <div className="anr-kpi">
          <span>Generated</span>
          <strong>{data.counts.generated}</strong>
        </div>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">Top headlines by confidence</div>
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
      </div>

      <div className="anr-card">
        <div className="anr-card__head">Source reliability</div>
        <div className="anr-table-wrap">
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
        </div>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">Trending searches</div>
        <p style={{ padding: "0.75rem 1rem", margin: 0, fontSize: "0.8125rem" }}>
          {data.trending.trendingSearches.join(" · ") || "—"}
        </p>
      </div>
    </>
  );
}
