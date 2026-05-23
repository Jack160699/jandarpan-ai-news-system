"use client";

import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { StoriesTable } from "@/components/admin-newsroom/StoriesTable";

export function EditorialOverview() {
  const { data, loading, error } = useAdminNewsroom();

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

  if (!data) return null;

  const pending = data.generatedArticles.filter(
    (a) => a.editorial_status === "pending"
  );

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}
      <div className="anr-kpis">
        <div className="anr-kpi">
          <span>Signals</span>
          <strong>{data.counts.signals}</strong>
        </div>
        <div className="anr-kpi">
          <span>Events</span>
          <strong>{data.counts.events}</strong>
        </div>
        <div className="anr-kpi">
          <span>Pending</span>
          <strong>{data.counts.pending}</strong>
        </div>
        <div className="anr-kpi">
          <span>Approved</span>
          <strong>{data.counts.approved}</strong>
        </div>
        <div className="anr-kpi">
          <span>Breaking</span>
          <strong>{data.trending.breakingCount}</strong>
        </div>
        <div className="anr-kpi">
          <span>Image queue</span>
          <strong>{data.counts.imageQueuePending}</strong>
        </div>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">Latest ingestion</div>
        <div className="anr-table-wrap">
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
              {data.ingestion.recentLogs.slice(0, 5).map((log) => (
                <tr key={log.id}>
                  <td>{log.status}</td>
                  <td>{log.inserted}</td>
                  <td>{log.total_fetched}</td>
                  <td>{log.failed_validation}</td>
                  <td>{new Date(log.created_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">
          Pending review ({pending.length})
        </div>
      </div>
      <StoriesTable articles={pending.length ? pending : data.generatedArticles.slice(0, 8)} />
    </>
  );
}
