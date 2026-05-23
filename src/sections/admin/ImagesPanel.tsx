"use client";

import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";

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
        <div className="anr-kpi">
          <span>Pending images</span>
          <strong>{data.counts.imageQueuePending}</strong>
        </div>
      </div>

      <div className="anr-card">
        <div className="anr-card__head">Editorial image queue</div>
        <div className="anr-table-wrap">
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
                      <button
                        type="button"
                        className="anr-btn"
                        disabled={busy}
                        onClick={() =>
                          runAction("regenerate_image", {
                            articleId: row.generated_article_id,
                          })
                        }
                      >
                        Regenerate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data.imageQueue.length ? (
            <p className="anr-empty">Image queue is empty.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
