"use client";

import { useEditorialDesk } from "@/providers/EditorialDeskContext";

export function MonitoringPanel() {
  const { data, loading } = useEditorialDesk();
  if (loading && !data) return null;

  const metrics = data?.apiMetrics ?? [];
  const queue = data?.aiQueue ?? [];
  const images = data?.imageQueue ?? [];

  return (
    <div className="anr-stack">
      <div className="anr-card">
        <h2 className="anr-card__title">API routes (tenant)</h2>
        <div className="anr-table-wrap">
          <table className="anr-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Calls</th>
                <th>Avg latency</th>
                <th>Error rate</th>
                <th>Last status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={`${m.method}-${m.route}`}>
                  <td>
                    <code>
                      {m.method} {m.route}
                    </code>
                  </td>
                  <td>{m.count}</td>
                  <td>{m.avgLatencyMs}ms</td>
                  <td>{(m.errorRate * 100).toFixed(1)}%</td>
                  <td>{m.lastStatus ?? "—"}</td>
                </tr>
              ))}
              {!metrics.length ? (
                <tr>
                  <td colSpan={5} className="anr-meta">
                    No API samples yet — wire middleware logging to populate
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="anr-grid anr-grid--2">
        <div className="anr-card">
          <h2 className="anr-card__title">AI queue</h2>
          <p className="anr-meta">{data?.counts.aiQueuePending ?? 0} pending</p>
          <ul className="saas-audit-list">
            {queue.slice(0, 8).map((q) => (
              <li key={q.id}>
                {q.status} · {q.article_id.slice(0, 8)}…
                {q.error ? ` · ${q.error}` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="anr-card">
          <h2 className="anr-card__title">Image queue</h2>
          <p className="anr-meta">
            {data?.counts.imageQueuePending ?? 0} pending
          </p>
          <ul className="saas-audit-list">
            {images.slice(0, 8).map((q) => (
              <li key={q.id}>
                {q.status} · {q.attempts} attempts
                {q.error ? ` · ${q.error}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
