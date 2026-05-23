"use client";

import { useEditorialDesk } from "@/providers/EditorialDeskContext";

export function ProvidersPanel() {
  const { data, loading } = useEditorialDesk();
  if (loading && !data) return null;

  const providers = data?.providerMetrics ?? [];
  const rss = data?.sourceHealth ?? [];
  const reliability = data?.sourceReliability ?? [];

  return (
    <div className="anr-stack">
      <div className="anr-card">
        <h2 className="anr-card__title">API providers</h2>
        <div className="anr-table-wrap">
          <table className="anr-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Health</th>
                <th>Latency</th>
                <th>Failures</th>
                <th>Last batch</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.providerId}>
                  <td>{p.providerId}</td>
                  <td>
                    <span
                      className={
                        p.healthy ? "anr-pill anr-pill--ok" : "anr-pill anr-pill--bad"
                      }
                    >
                      {p.healthScore}%
                    </span>
                  </td>
                  <td>{p.avgLatencyMs}ms</td>
                  <td>{p.consecutiveFailures}</td>
                  <td>{p.lastArticleCount}</td>
                </tr>
              ))}
              {!providers.length ? (
                <tr>
                  <td colSpan={5} className="anr-meta">
                    No API provider metrics
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="anr-card">
        <h2 className="anr-card__title">RSS sources</h2>
        <div className="anr-table-wrap">
          <table className="anr-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Failures</th>
              </tr>
            </thead>
            <tbody>
              {rss.map((s) => (
                <tr key={s.source_id}>
                  <td>{s.name}</td>
                  <td>{s.tier}</td>
                  <td>
                    <span
                      className={
                        s.healthy ? "anr-pill anr-pill--ok" : "anr-pill anr-pill--bad"
                      }
                    >
                      {s.healthy ? "Healthy" : "Degraded"}
                    </span>
                  </td>
                  <td>{s.consecutive_failures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="anr-card">
        <h2 className="anr-card__title">Source reliability (AI)</h2>
        <ul className="saas-audit-list">
          {reliability.map((r) => (
            <li key={`${r.source}-${r.provider}`}>
              {r.source} · {r.provider} · confidence{" "}
              {(r.avgConfidence * 100).toFixed(0)}% · {r.articleCount} stories
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
