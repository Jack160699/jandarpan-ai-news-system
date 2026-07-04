"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { ActionButton } from "@/components/admin-newsroom/ui/ActionButton";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { MetricCard } from "@/components/admin-newsroom/ui/MetricCard";
import { QueueTable } from "@/components/admin-newsroom/ui/QueueTable";

type ImageMetrics = {
  successRate: number;
  retryRate: number;
  avgLatencyMs: number | null;
  queueDepth: number;
  processingCount: number;
  aiGenerated: number;
  failed: number;
  providerErrors: number;
};

type GenerationRow = {
  id: string;
  attempt_number: number;
  status: string;
  quality_score: number | null;
  hero_image_url: string | null;
  prompt: string;
  created_at: string;
};

export function ImagesPanel() {
  const { data, loading, error, runAction, busyId } = useAdminNewsroom();
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationRow[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [replaceUrl, setReplaceUrl] = useState("");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/editorial/images?articleId=");
      if (!res.ok) return;
      const json = (await res.json()) as { metrics?: ImageMetrics };
      if (json.metrics) setMetrics(json.metrics);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics, data?.counts.imageQueuePending]);

  const callImageApi = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/editorial/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
        data?: GenerationRow[];
      };
      if (!json.ok) {
        setPanelError(json.message ?? json.error ?? "Action failed");
        return null;
      }
      await loadMetrics();
      return json;
    } catch {
      setPanelError("Network error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async (articleId: string) => {
    if (expandedId === articleId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(articleId);
    const result = await callImageApi({ action: "history", articleId });
    setHistory(result?.data ?? []);
  };

  if (loading && !data) {
    return <div className="anr-skeleton" style={{ height: "16rem" }} />;
  }
  if (!data) return null;

  const articleById = new Map(data.generatedArticles.map((a) => [a.id, a]));

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}
      {panelError ? <p className="anr-error">{panelError}</p> : null}

      <div className="anr-kpis">
        <MetricCard label="Pending images" value={data.counts.imageQueuePending} />
        <MetricCard label="Processing" value={metrics?.processingCount ?? "—"} />
        <MetricCard
          label="Success rate (today)"
          value={metrics ? `${metrics.successRate}%` : "—"}
        />
        <MetricCard
          label="Avg latency"
          value={metrics?.avgLatencyMs ? `${metrics.avgLatencyMs}ms` : "—"}
        />
        <MetricCard label="AI generated (today)" value={metrics?.aiGenerated ?? "—"} />
        <MetricCard label="Provider errors" value={metrics?.providerErrors ?? "—"} />
      </div>

      <AdminCard
        title="Editorial image queue"
        description="Production image pipeline — regenerate, edit prompts, approve, compare."
      >
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
                const rowBusy =
                  busy ||
                  busyId?.includes(row.generated_article_id) ||
                  expandedId === row.generated_article_id;
                const isExpanded = expandedId === row.generated_article_id;

                return (
                  <Fragment key={row.id}>
                    <tr>
                      <td className="anr-meta">
                        {row.generated_article_id.slice(0, 8)}…
                      </td>
                      <td style={{ maxWidth: "14rem" }}>
                        {article?.headline ?? "—"}
                      </td>
                      <td>{row.status}</td>
                      <td>{row.attempts}</td>
                      <td>{row.image_source ?? "—"}</td>
                      <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        <ActionButton
                          disabled={rowBusy}
                          onClick={() =>
                            runAction("regenerate_image", {
                              articleId: row.generated_article_id,
                            })
                          }
                        >
                          Regenerate
                        </ActionButton>
                        <ActionButton
                          disabled={rowBusy}
                          onClick={() => openHistory(row.generated_article_id)}
                        >
                          {isExpanded ? "Hide" : "History"}
                        </ActionButton>
                        <ActionButton
                          disabled={rowBusy}
                          onClick={() =>
                            void callImageApi({
                              action: "approve",
                              articleId: row.generated_article_id,
                            })
                          }
                        >
                          Approve
                        </ActionButton>
                        <ActionButton
                          disabled={rowBusy}
                          onClick={() =>
                            void callImageApi({
                              action: "reject",
                              articleId: row.generated_article_id,
                            })
                          }
                        >
                          Reject
                        </ActionButton>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr key={`${row.id}-detail`}>
                        <td colSpan={6}>
                          <div
                            style={{
                              padding: "0.75rem",
                              display: "grid",
                              gap: "0.75rem",
                            }}
                          >
                            <label style={{ display: "grid", gap: "0.25rem" }}>
                              <span className="anr-meta">Custom prompt</span>
                              <textarea
                                rows={3}
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Edit generation prompt…"
                                style={{ width: "100%", fontSize: "0.85rem" }}
                              />
                              <ActionButton
                                disabled={rowBusy || !customPrompt.trim()}
                                onClick={() =>
                                  void callImageApi({
                                    action: "edit_prompt",
                                    articleId: row.generated_article_id,
                                    customPrompt: customPrompt.trim(),
                                  })
                                }
                              >
                                Save prompt &amp; regenerate
                              </ActionButton>
                            </label>

                            <label style={{ display: "grid", gap: "0.25rem" }}>
                              <span className="anr-meta">Replace hero URL</span>
                              <input
                                type="url"
                                value={replaceUrl}
                                onChange={(e) => setReplaceUrl(e.target.value)}
                                placeholder="https://…"
                                style={{ width: "100%", fontSize: "0.85rem" }}
                              />
                              <ActionButton
                                disabled={rowBusy || !replaceUrl.trim()}
                                onClick={() =>
                                  void callImageApi({
                                    action: "replace",
                                    articleId: row.generated_article_id,
                                    heroUrl: replaceUrl.trim(),
                                  })
                                }
                              >
                                Replace image
                              </ActionButton>
                            </label>

                            {history.length ? (
                              <div>
                                <p className="anr-meta">Generation history</p>
                                <table className="anr-table" style={{ fontSize: "0.8rem" }}>
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>Status</th>
                                      <th>Score</th>
                                      <th>Preview</th>
                                      <th>Prompt</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {history.map((h) => (
                                      <tr key={h.id}>
                                        <td>{h.attempt_number}</td>
                                        <td>{h.status}</td>
                                        <td>
                                          {h.quality_score != null
                                            ? h.quality_score.toFixed(2)
                                            : "—"}
                                        </td>
                                        <td>
                                          {h.hero_image_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={h.hero_image_url}
                                              alt=""
                                              width={80}
                                              height={45}
                                              style={{ objectFit: "cover" }}
                                            />
                                          ) : (
                                            "—"
                                          )}
                                        </td>
                                        <td style={{ maxWidth: "20rem" }}>
                                          {h.prompt.slice(0, 120)}…
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="anr-meta">No generation history yet.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!data.imageQueue.length ? (
            <EmptyState
              title="Image queue is empty."
              hint="New editorial image jobs appear here after articles publish."
            />
          ) : null}
        </QueueTable>
      </AdminCard>
    </>
  );
}
