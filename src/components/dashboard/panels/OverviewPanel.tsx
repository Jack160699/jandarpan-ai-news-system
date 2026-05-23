"use client";

import { useEditorialDesk } from "@/providers/EditorialDeskContext";

export function OverviewPanel() {
  const { data, loading, error } = useEditorialDesk();

  if (loading && !data) {
    return (
      <div className="anr-card">
        <div className="anr-skeleton" style={{ height: "8rem" }} />
      </div>
    );
  }

  if (error) return <p className="anr-error">{error}</p>;
  if (!data) return null;

  const kpis = [
    { label: "Signals", value: data.counts.signals },
    { label: "Events", value: data.counts.events },
    { label: "Stories", value: data.counts.generated },
    { label: "Pending review", value: data.counts.pending },
    { label: "Published", value: data.counts.approved },
    { label: "Breaking", value: data.trending.breakingCount },
  ];

  const articlesPct = data.billing
    ? Math.min(
        100,
        Math.round(
          (data.billing.articlesUsed / data.billing.articlesLimit) * 100
        )
      )
    : 0;

  return (
    <div className="anr-stack">
      <div className="saas-kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="saas-kpi">
            <div className="saas-kpi__value">{k.value}</div>
            <div className="saas-kpi__label">{k.label}</div>
          </div>
        ))}
      </div>

      {data.billing ? (
        <div className="anr-card saas-plan-card">
          <p className="saas-plan-card__name">
            Plan · {data.billing.planId} ({data.billing.planStatus})
          </p>
          <p className="anr-meta">
            Articles {data.billing.articlesUsed} / {data.billing.articlesLimit}
          </p>
          <div className="saas-usage-bar">
            <div
              className="saas-usage-bar__fill"
              style={{ width: `${articlesPct}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="anr-grid anr-grid--2">
        <div className="anr-card">
          <h2 className="anr-card__title">Ingestion</h2>
          {data.ingestion.lastRun ? (
            <p className="anr-meta">
              Last run · {data.ingestion.lastRun.status} ·{" "}
              {data.ingestion.lastRun.inserted} inserted
            </p>
          ) : (
            <p className="anr-meta">No runs yet</p>
          )}
        </div>
        <div className="anr-card">
          <h2 className="anr-card__title">Recent audit</h2>
          <ul className="saas-audit-list">
            {data.recentAudit.slice(0, 6).map((a) => (
              <li key={a.id}>
                <strong>{a.action}</strong> · {a.userEmail ?? "system"} ·{" "}
                {new Date(a.createdAt).toLocaleString()}
              </li>
            ))}
            {!data.recentAudit.length ? (
              <li className="anr-meta">No actions logged yet</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
