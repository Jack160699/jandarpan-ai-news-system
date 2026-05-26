"use client";

import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { ActionButton } from "@/components/admin-newsroom/ui/ActionButton";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { MetricCard } from "@/components/admin-newsroom/ui/MetricCard";
import { QueueTable } from "@/components/admin-newsroom/ui/QueueTable";

export function ImagesPanel() {
  const { data, loading, error, runAction, busyId } = useAdminNewsroom();

  if (loading && !data) {
    return <div className="anr-skeleton" style={{ height: "16rem" }} />;
  }
  if (!data) return null;

  const articleById = new Map(
    data.generatedArticles.map((a) => [a.id, a])
  );

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}
      <div className="anr-kpis">
        <MetricCard label="Pending images" value={data.counts.imageQueuePending} />
      </div>

      <AdminCard title="Editorial image queue" description="Visual generation quality queue.">
        <QueueTable>
          <table className="anr-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Headline</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.imageQueue.map((row) => {
                const article = articleById.get(row.generated_article_id);
                const busy = busyId?.includes(row.generated_article_id);
                return (
                  <tr key={row.id}>
                    <td className="anr-meta">{row.generated_article_id.slice(0, 8)}…</td>
                    <td style={{ maxWidth: "14rem" }}>
                      {article?.headline ?? "—"}
                    </td>
                    <td>{row.status}</td>
                    <td>{row.attempts}</td>
                    <td>{row.image_source ?? "—"}</td>
                    <td>
                      <ActionButton
                        disabled={busy}
                        onClick={() =>
                          runAction("regenerate_image", {
                            articleId: row.generated_article_id,
                          })
                        }
                      >
                        Regenerate
                      </ActionButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data.imageQueue.length ? (
            <EmptyState title="Image queue is empty." hint="New editorial image jobs appear here." />
          ) : null}
        </QueueTable>
      </AdminCard>
    </>
  );
}
