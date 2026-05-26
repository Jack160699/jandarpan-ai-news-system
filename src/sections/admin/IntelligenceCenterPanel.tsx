"use client";

import { useCallback, useEffect, useState } from "react";
import type { NewsroomIntelligenceSnapshot } from "@/lib/intelligence/types";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function IntelligenceCenterPanel() {
  const [data, setData] = useState<NewsroomIntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"feed" | "graph" | "events" | "heatmap">("feed");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/editorial/intelligence", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load intelligence");
        return;
      }
      const { ok: _ok, ...snapshot } = json;
      setData(snapshot as NewsroomIntelligenceSnapshot);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading && !data) {
    return (
      <div className="anr-icenter">
        <div className="anr-skeleton" style={{ height: "14rem" }} />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Intelligence offline" hint={error} />;
  }

  if (!data) return null;

  const s = data.summary;

  return (
    <div className="anr-icenter">
      <header className="anr-icenter__terminal-bar">
        <div className="anr-icenter__brand">
          <span className="anr-icenter__dot" />
          <strong>JAN DARPAN</strong>
          <em>INTELLIGENCE CENTER</em>
        </div>
        <LiveIndicator label="Realtime ingestion" />
        <span className="anr-icenter__clock">
          <ClientTime iso={data.fetchedAt} preset="datetime" />
        </span>
      </header>

      <div className="anr-icenter__ticker">
        <span>VEC {s.vectorIndexed}</span>
        <span>SIG {s.liveSignals}</span>
        <span>SEM {s.semanticClusters}</span>
        <span>ALERT {s.districtAlerts}</span>
        <span>MISINFO {s.highRiskCount}</span>
        <span>INGEST 24H {data.ingestionAnalysis.signalsIngested24h}</span>
      </div>

      <div className="anr-kpis anr-icenter__kpis">
        <article className="anr-kpi anr-icenter__kpi">
          <span>Articles</span>
          <strong>{s.articlesAnalyzed}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Misinfo risk</span>
          <strong className="anr-kpi--warn">{s.highRiskCount}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Breaking</span>
          <strong>{s.breakingCandidates}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Trust avg</span>
          <strong>{pct(s.avgTrustScore)}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Embed index</span>
          <strong>{s.vectorIndexed}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Avg break prob</span>
          <strong>{pct(data.ingestionAnalysis.avgBreakingProbability)}</strong>
        </article>
      </div>

      <div className="anr-icenter__layout">
        <aside className="anr-icenter__rail">
          <AdminCard title="AI newsroom recommendations" className="anr-icenter__card">
            <ul className="anr-icenter__list">
              {data.recommendations.slice(0, 8).map((r) => (
                <li key={r.id} data-priority={r.priority}>
                  <strong>{r.action}</strong>
                  <span>{r.reason}</span>
                </li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="District risk alerts" className="anr-icenter__card">
            <ul className="anr-icenter__list">
              {data.districtRiskAlerts.length === 0 ? (
                <li className="anr-meta">No elevated districts</li>
              ) : (
                data.districtRiskAlerts.map((d) => (
                  <li key={d.districtSlug}>
                    <span
                      className="anr-icenter__pill"
                      style={{ background: RISK_COLORS[d.level] }}
                    >
                      {d.level}
                    </span>
                    <div>
                      <strong>{d.districtName}</strong>
                      <span>{d.message}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </AdminCard>

          <AdminCard title="Fact-check queue" className="anr-icenter__card">
            <ul className="anr-icenter__list anr-icenter__list--compact">
              {data.factCheckQueue.slice(0, 6).map((f, i) => (
                <li key={`${f.articleId}-${f.id}-${i}`}>
                  <strong>{f.check}</strong>
                  <span>{f.headline.slice(0, 48)}…</span>
                </li>
              ))}
            </ul>
          </AdminCard>
        </aside>

        <main className="anr-icenter__main">
          <nav className="anr-icenter__tabs" aria-label="Intelligence views">
            {(
              [
                ["feed", "Live signal feed"],
                ["graph", "Source graph"],
                ["events", "Event relationships"],
                ["heatmap", "Confidence heatmap"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={tab === key ? "is-active" : ""}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === "feed" && (
            <div className="anr-icenter__panel">
              <table className="anr-icenter__table">
                <thead>
                  <tr>
                    <th>Signal</th>
                    <th>Source</th>
                    <th>Misinfo</th>
                    <th>Sentiment</th>
                    <th>Political</th>
                    <th>Break %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.liveSignalFeed.map((row) => (
                    <tr key={row.signalId}>
                      <td title={row.title}>{row.title.slice(0, 56)}…</td>
                      <td>
                        {row.provider}
                        {row.source ? ` · ${row.source}` : ""}
                      </td>
                      <td data-warn={row.misinfoRisk >= 0.5}>
                        {pct(row.misinfoRisk)}
                      </td>
                      <td data-sentiment={row.sentiment}>{row.sentiment}</td>
                      <td>{pct(row.politicalSensitivity)}</td>
                      <td data-hot={row.breakingProbability >= 0.5}>
                        {pct(row.breakingProbability)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "graph" && (
            <div className="anr-icenter__panel anr-icenter__graph">
              <div className="anr-icenter__graph-col">
                <h4>Source trust + reputation memory</h4>
                <ul>
                  {data.sourceTrust.slice(0, 6).map((st) => (
                    <li key={st.sourceId} className="anr-icenter__node">
                      <span>{st.sourceName}</span>
                      <em data-tier={st.tier}>{pct(st.trustScore)}</em>
                    </li>
                  ))}
                </ul>
                <ul className="anr-icenter__mem">
                  {data.sourceReputation.slice(0, 6).map((m) => (
                    <li key={m.sourceKey}>
                      <span>{m.sourceName}</span>
                      <em>{pct(m.reputationScore)}</em>
                      <small>{m.totalSignals} signals</small>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="anr-icenter__graph-edges">
                <h4>Vector duplicate links</h4>
                {data.vectorDuplicates.length === 0 ? (
                  <p className="anr-meta">No semantic duplicates in window</p>
                ) : (
                  <ul>
                    {data.vectorDuplicates.map((v, i) => (
                      <li key={`${v.entityId}-${i}`}>
                        <span>article ↔ {v.entityType}</span>
                        <strong>{pct(v.similarity)}</strong>
                        <em>{v.headline?.slice(0, 40)}</em>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === "events" && (
            <div className="anr-icenter__panel">
              <div className="anr-icenter__events-grid">
                <section>
                  <h4>Event nodes</h4>
                  <ul>
                    {data.eventGraph.nodes.slice(0, 10).map((n) => (
                      <li key={n.eventId} className="anr-icenter__event-node">
                        <strong>{n.title.slice(0, 52)}</strong>
                        <span>
                          {n.signalCount} sig · urgency {pct(n.urgencyScore)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4>Relationships</h4>
                  <ul className="anr-icenter__edges">
                    {data.eventGraph.edges.slice(0, 14).map((e, i) => (
                      <li key={`${e.fromEventId}-${e.toEventId}-${i}`}>
                        <code>{e.relationship}</code>
                        <span>w={e.weight}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4>Semantic clusters</h4>
                  <ul>
                    {data.semanticClusters
                      .filter((c) => c.memberIds.length > 1)
                      .slice(0, 8)
                      .map((c) => (
                        <li key={c.clusterId}>
                          <strong>{c.centroidTitle.slice(0, 48)}</strong>
                          <span>{c.memberIds.length} signals · {c.method}</span>
                        </li>
                      ))}
                  </ul>
                </section>
              </div>
            </div>
          )}

          {tab === "heatmap" && (
            <div className="anr-icenter__panel">
              <div className="anr-icenter__heatmap">
                {data.confidenceHeatmap.map((cell) => (
                  <div
                    key={cell.key}
                    className="anr-icenter__heat-cell"
                    style={{
                      opacity: 0.35 + cell.confidence * 0.65,
                      borderColor:
                        cell.confidence >= 0.7
                          ? "#22c55e"
                          : cell.confidence >= 0.5
                            ? "#eab308"
                            : "#ef4444",
                    }}
                    title={`${cell.label}: ${pct(cell.confidence)} (${cell.count})`}
                  >
                    <span>{cell.label.slice(0, 14)}</span>
                    <strong>{pct(cell.confidence)}</strong>
                  </div>
                ))}
              </div>
              <div className="anr-icenter__trend-row">
                <h4>Trend acceleration</h4>
                <ul>
                  {data.trendAcceleration.slice(0, 6).map((t) => (
                    <li key={t.topic} data-alert={t.alert}>
                      <strong>{t.topic}</strong>
                      <span>+{t.acceleration} · {t.velocity1h}/hr</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </main>

        <aside className="anr-icenter__rail anr-icenter__rail--right">
          <AdminCard title="Misinfo watch" className="anr-icenter__card">
            <ul className="anr-icenter__list">
              {data.topRisks.slice(0, 5).map((r) => (
                <li key={r.articleId}>
                  <span
                    className="anr-icenter__pill"
                    style={{ background: RISK_COLORS[r.level] }}
                  >
                    {r.level}
                  </span>
                  <div>
                    <strong>{r.headline.slice(0, 56)}</strong>
                    <span>{r.recommendation}</span>
                  </div>
                </li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="Political sensitivity" className="anr-icenter__card">
            <ul className="anr-icenter__list anr-icenter__list--compact">
              {data.politicalSensitivity.slice(0, 5).map((p) => (
                <li key={p.articleId}>
                  <span
                    className="anr-icenter__pill"
                    style={{ background: RISK_COLORS[p.level] }}
                  >
                    {pct(p.score)}
                  </span>
                  <span>{p.topics.join(", ") || "general"}</span>
                </li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="Ingestion analysis" className="anr-icenter__card">
            <dl className="anr-icenter__stats">
              <div>
                <dt>24h signals</dt>
                <dd>{data.ingestionAnalysis.signalsIngested24h}</dd>
              </div>
              <div>
                <dt>Embedded</dt>
                <dd>{data.ingestionAnalysis.embeddedCount}</dd>
              </div>
              <div>
                <dt>Avg misinfo</dt>
                <dd>{pct(data.ingestionAnalysis.avgMisinfoRisk)}</dd>
              </div>
            </dl>
            <ul className="anr-icenter__providers">
              {data.ingestionAnalysis.topProviders.map((p) => (
                <li key={p.provider}>
                  <span>{p.provider}</span>
                  <em>{p.count}</em>
                </li>
              ))}
            </ul>
          </AdminCard>
        </aside>
      </div>
    </div>
  );
}
