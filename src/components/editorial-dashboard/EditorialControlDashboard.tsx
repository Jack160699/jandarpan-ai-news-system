"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import "@/styles/editorial-dashboard.css";

const POLL_MS = 12_000;

const NAV = [
  { id: "ingestion", label: "Ingestion" },
  { id: "sources", label: "Source health" },
  { id: "ai-queue", label: "AI queue" },
  { id: "clusters", label: "Event clusters" },
  { id: "articles", label: "Generated articles" },
  { id: "trending", label: "Trending" },
  { id: "reliability", label: "Source reliability" },
  { id: "images", label: "Image queue" },
] as const;

type Props = {
  adminKey: string;
};

function confidenceClass(score: number | null): string {
  if (score == null) return "ed-confidence";
  if (score >= 0.75) return "ed-confidence ed-confidence--high";
  if (score >= 0.5) return "ed-confidence ed-confidence--mid";
  return "ed-confidence ed-confidence--low";
}

function formatPct(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function EditorialControlDashboard({ adminKey }: Props) {
  const [data, setData] = useState<EditorialDashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/editorial/dashboard?key=${encodeURIComponent(adminKey)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load dashboard");
        return;
      }
      setData(json as EditorialDashboardSnapshot);
      setError(null);
    } catch {
      setError("Network error");
    }
  }, [adminKey]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function runAction(
    action: string,
    payload: Record<string, string | number>
  ) {
    setBusy(`${action}-${payload.articleId ?? payload.sourceId}`);
    try {
      const res = await fetch(`/api/editorial/actions?key=${encodeURIComponent(adminKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? json.error ?? "Action failed");
      } else {
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) {
    return (
      <div className="ed-dashboard">
        <p className="ed-error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ed-dashboard">
        <p className="ed-empty">Loading editorial dashboard…</p>
      </div>
    );
  }

  return (
    <div className="ed-dashboard">
      <div className="ed-shell">
        <nav className="ed-nav" aria-label="Dashboard sections">
          <p className="ed-nav-title">Editorial control</p>
          {NAV.map((item) => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ed-main">
          <header className="ed-header">
            <div>
              <p className="ed-meta">CG Newsroom · Operations</p>
              <h1>Editorial Control</h1>
            </div>
            <div>
              <span className="ed-live">
                <span className="ed-live-dot" aria-hidden />
                Live · {POLL_MS / 1000}s refresh
              </span>
              <p className="ed-meta">Updated {formatTime(data.fetchedAt)}</p>
            </div>
          </header>

          {error ? (
            <p className="ed-error" style={{ marginBottom: "1rem" }}>
              {error}
            </p>
          ) : null}

          <div className="ed-kpis">
            <div className="ed-kpi">
              <span>Signals</span>
              <strong>{data.counts.signals}</strong>
            </div>
            <div className="ed-kpi">
              <span>Events</span>
              <strong>{data.counts.events}</strong>
            </div>
            <div className="ed-kpi">
              <span>Pending review</span>
              <strong>{data.counts.pending}</strong>
            </div>
            <div className="ed-kpi">
              <span>AI queue</span>
              <strong>{data.counts.aiQueuePending}</strong>
            </div>
            <div className="ed-kpi">
              <span>Image queue</span>
              <strong>{data.counts.imageQueuePending}</strong>
            </div>
            <div className="ed-kpi">
              <span>Approved</span>
              <strong>{data.counts.approved}</strong>
            </div>
          </div>

          <section id="ingestion" className="ed-section">
            <h2>1 · Ingestion monitor</h2>
            <div className="ed-panel">
              {data.ingestion.lastRun ? (
                <table className="ed-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Inserted</th>
                      <th>Fetched</th>
                      <th>Failed</th>
                      <th>Duration</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <span
                          className={`ed-badge ${
                            data.ingestion.lastRun.status === "success"
                              ? "ed-badge--ok"
                              : "ed-badge--err"
                          }`}
                        >
                          {data.ingestion.lastRun.status}
                        </span>
                      </td>
                      <td>{data.ingestion.lastRun.inserted}</td>
                      <td>{data.ingestion.lastRun.total_fetched}</td>
                      <td>{data.ingestion.lastRun.failed_validation}</td>
                      <td>
                        {data.ingestion.lastRun.duration_ms != null
                          ? `${data.ingestion.lastRun.duration_ms}ms`
                          : "—"}
                      </td>
                      <td>{formatTime(data.ingestion.lastRun.created_at)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="ed-empty">No ingestion runs yet</p>
              )}
            </div>
            {data.ingestion.recentFailures.length > 0 && (
              <div className="ed-panel" style={{ marginTop: "0.75rem" }}>
                <table className="ed-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Provider</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ingestion.recentFailures.slice(0, 8).map((f) => (
                      <tr key={f.id}>
                        <td>{f.title ?? "—"}</td>
                        <td>{f.provider ?? "—"}</td>
                        <td>{f.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="sources" className="ed-section">
            <h2>2 · Source health</h2>
            <div className="ed-panel">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Tier</th>
                    <th>Status</th>
                    <th>Failures</th>
                    <th>Last OK</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sourceHealth.map((s) => (
                    <tr key={s.source_id}>
                      <td>{s.name}</td>
                      <td>{s.tier}</td>
                      <td>
                        {s.disabled_until &&
                        new Date(s.disabled_until).getTime() > Date.now() ? (
                          <span className="ed-badge ed-badge--err">Disabled</span>
                        ) : s.healthy ? (
                          <span className="ed-badge ed-badge--ok">Healthy</span>
                        ) : (
                          <span className="ed-badge ed-badge--warn">Degraded</span>
                        )}
                      </td>
                      <td>{s.failures}</td>
                      <td>{formatTime(s.last_success)}</td>
                      <td>
                        <div className="ed-actions">
                          <button
                            type="button"
                            className="ed-btn ed-btn--danger"
                            disabled={busy != null}
                            onClick={() =>
                              runAction("disable_rss", { sourceId: s.source_id })
                            }
                          >
                            Disable 48h
                          </button>
                          <button
                            type="button"
                            className="ed-btn"
                            disabled={busy != null}
                            onClick={() =>
                              runAction("enable_rss", { sourceId: s.source_id })
                            }
                          >
                            Enable
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="ai-queue" className="ed-section">
            <h2>3 · AI queue</h2>
            <div className="ed-panel">
              {data.aiQueue.length ? (
                <table className="ed-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Status</th>
                      <th>Error</th>
                      <th>Queued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.aiQueue.map((q) => (
                      <tr key={q.id}>
                        <td className="ed-meta">{q.article_id.slice(0, 8)}…</td>
                        <td>
                          <span
                            className={`ed-badge ${
                              q.status === "completed"
                                ? "ed-badge--ok"
                                : q.status === "failed"
                                  ? "ed-badge--err"
                                  : "ed-badge--warn"
                            }`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td>{q.error ?? "—"}</td>
                        <td>{formatTime(q.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="ed-empty">AI queue empty</p>
              )}
            </div>
          </section>

          <section id="clusters" className="ed-section">
            <h2>4 · Event clusters</h2>
            <div className="ed-panel">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Region</th>
                    <th>Signals</th>
                    <th>Urgency</th>
                    <th>Clustering logic</th>
                  </tr>
                </thead>
                <tbody>
                  {data.eventClusters.map((e) => (
                    <tr key={e.id}>
                      <td>{e.canonical_title}</td>
                      <td>{e.region ?? e.category ?? "—"}</td>
                      <td>{e.signal_count}</td>
                      <td>{e.urgency_score.toFixed(2)}</td>
                      <td>
                        <pre className="ed-cluster-json">
                          {JSON.stringify(
                            {
                              method: e.clustering_metadata.method,
                              similarity: e.clustering_metadata.similarity_score,
                              entities: e.clustering_metadata.shared_entities,
                              reasons: e.clustering_metadata.reasons,
                            },
                            null,
                            0
                          )}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="articles" className="ed-section">
            <h2>5 · Generated articles</h2>
            <div className="ed-panel">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Headline</th>
                    <th>Status</th>
                    <th>AI confidence</th>
                    <th>Sources</th>
                    <th>Pin</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.generatedArticles.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <a
                          href={`/story/${a.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#fbbf24" }}
                        >
                          {a.headline}
                        </a>
                      </td>
                      <td>
                        <span
                          className={`ed-badge ${
                            a.editorial_status === "approved"
                              ? "ed-badge--ok"
                              : a.editorial_status === "rejected"
                                ? "ed-badge--err"
                                : "ed-badge--warn"
                          }`}
                        >
                          {a.editorial_status}
                        </span>
                      </td>
                      <td className={confidenceClass(a.ai_confidence)}>
                        {formatPct(a.ai_confidence)}
                      </td>
                      <td>{a.source_count ?? "—"}</td>
                      <td>
                        {a.homepage_pin ? (
                          <span className="ed-badge ed-badge--ok">Pinned</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <div className="ed-actions">
                          {a.editorial_status !== "approved" && (
                            <button
                              type="button"
                              className="ed-btn ed-btn--primary"
                              disabled={busy != null}
                              onClick={() =>
                                runAction("approve", { articleId: a.id })
                              }
                            >
                              Approve
                            </button>
                          )}
                          {a.editorial_status !== "rejected" && (
                            <button
                              type="button"
                              className="ed-btn ed-btn--danger"
                              disabled={busy != null}
                              onClick={() =>
                                runAction("reject", { articleId: a.id })
                              }
                            >
                              Reject
                            </button>
                          )}
                          {!a.homepage_pin ? (
                            <button
                              type="button"
                              className="ed-btn"
                              disabled={busy != null}
                              onClick={() => runAction("pin", { articleId: a.id })}
                            >
                              Pin hero
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="ed-btn"
                              disabled={busy != null}
                              onClick={() =>
                                runAction("unpin", { articleId: a.id })
                              }
                            >
                              Unpin
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="trending" className="ed-section">
            <h2>6 · Trending analytics</h2>
            <div className="ed-kpis">
              <div className="ed-kpi">
                <span>Avg ranking score</span>
                <strong>{(data.trending.rankingAvg * 100).toFixed(0)}%</strong>
              </div>
              <div className="ed-kpi">
                <span>Breaking signals</span>
                <strong>{data.trending.breakingCount}</strong>
              </div>
            </div>
            <div className="ed-panel">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Top headline</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trending.topHeadlines.map((t, i) => (
                    <tr key={i}>
                      <td>{t.headline}</td>
                      <td className={confidenceClass(t.score)}>
                        {formatPct(t.score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ed-meta" style={{ marginTop: "0.5rem" }}>
              Trending searches: {data.trending.trendingSearches.join(" · ") || "—"}
            </p>
          </section>

          <section id="reliability" className="ed-section">
            <h2>7 · Source reliability</h2>
            <div className="ed-panel">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Provider</th>
                    <th>Avg confidence</th>
                    <th>Articles</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sourceReliability.map((r, i) => (
                    <tr key={i}>
                      <td>{r.source}</td>
                      <td>{r.provider}</td>
                      <td className={confidenceClass(r.avgConfidence)}>
                        {formatPct(r.avgConfidence)}
                      </td>
                      <td>{r.articleCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="images" className="ed-section">
            <h2>8 · Image generation queue</h2>
            <div className="ed-panel">
              {data.imageQueue.length ? (
                <table className="ed-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Attempts</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.imageQueue.map((q) => (
                      <tr key={q.id}>
                        <td className="ed-meta">
                          {q.generated_article_id.slice(0, 8)}…
                        </td>
                        <td>
                          <span
                            className={`ed-badge ${
                              q.status === "completed"
                                ? "ed-badge--ok"
                                : q.status === "failed"
                                  ? "ed-badge--err"
                                  : "ed-badge--warn"
                            }`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td>{q.image_source ?? "—"}</td>
                        <td>{q.attempts}</td>
                        <td>{q.error ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="ed-empty">Image queue empty</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
