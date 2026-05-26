"use client";

import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { QueueTable } from "@/components/admin-newsroom/ui/QueueTable";

export function LiveWirePanel() {
  const { data, loading, error } = useAdminNewsroom();

  if (loading && !data) {
    return <div className="anr-skeleton" style={{ height: "16rem" }} />;
  }
  if (!data) return null;

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}
      <AdminCard title="Event clusters (live wire feed)">
        <QueueTable>
          <table className="anr-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Region</th>
                <th>Urgency</th>
                <th>Sources</th>
                <th>Signals</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.eventClusters.map((event) => (
                <tr key={event.id}>
                  <td style={{ maxWidth: "20rem" }}>{event.canonical_title}</td>
                  <td>{event.region ?? "—"}</td>
                  <td>{Math.round(event.urgency_score * 100)}%</td>
                  <td>{event.source_count}</td>
                  <td>{event.signal_count}</td>
                  <td>
                    {new Date(event.created_at).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </QueueTable>
      </AdminCard>

      <AdminCard title="AI processing queue">
        <QueueTable>
          <table className="anr-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {data.aiQueue.map((q) => (
                <tr key={q.id}>
                  <td className="anr-meta">{q.article_id}</td>
                  <td>{q.status}</td>
                  <td>{q.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </QueueTable>
      </AdminCard>
    </>
  );
}
