"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import type { SerpRankingsDashboard } from "@/lib/serp-intelligence/types";

type RankingsPayload = {
  ok: boolean;
  enabled: boolean;
  providerConfigured: boolean;
  dashboard: SerpRankingsDashboard;
};

type OpportunitiesPayload = {
  ok: boolean;
  opportunities: SerpRankingsDashboard["topOpportunities"];
};

export function SerpRankingsPanel() {
  const [dashboard, setDashboard] = useState<SerpRankingsDashboard | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [opportunities, setOpportunities] = useState<
    SerpRankingsDashboard["topOpportunities"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customKeyword, setCustomKeyword] = useState("");
  const [customGroup, setCustomGroup] = useState("Custom");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [rankRes, oppRes] = await Promise.all([
        fetch("/api/admin/seo/rankings", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/admin/seo/opportunities?limit=30", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const rankJson = (await rankRes.json()) as RankingsPayload & {
        error?: string;
      };
      const oppJson = (await oppRes.json()) as OpportunitiesPayload & {
        error?: string;
      };

      if (!rankRes.ok || !rankJson.ok) {
        setError(rankJson.error ?? "Failed to load SERP rankings");
        return;
      }

      setDashboard(rankJson.dashboard);
      setEnabled(rankJson.enabled);
      setProviderConfigured(rankJson.providerConfigured);
      setOpportunities(oppJson.ok ? oppJson.opportunities : []);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    const id = setInterval(() => {
      void refresh();
    }, 60_000);
    return () => {
      clearTimeout(timer);
      clearInterval(id);
    };
  }, [refresh]);

  async function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!customKeyword.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/seo/opportunities", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: customKeyword.trim(),
          group_name: customGroup.trim() || "Custom",
        }),
      });
      if (res.ok) {
        setCustomKeyword("");
        void refresh();
      }
    } finally {
      setAdding(false);
    }
  }

  if (loading && !dashboard) {
    return (
      <div className="anr-icenter">
        <div className="anr-skeleton" style={{ height: "14rem" }} />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="SERP tracker offline" hint={error} />;
  }

  if (!dashboard) return null;

  return (
    <div className="anr-icenter">
      <header className="anr-icenter__terminal-bar">
        <div className="anr-icenter__brand">
          <span className="anr-icenter__dot" />
          <strong>SERP</strong>
          <em>INTELLIGENCE</em>
        </div>
        <LiveIndicator
          label={
            enabled && providerConfigured
              ? "Tracker active"
              : enabled
                ? "API key needed"
                : "Tracker disabled"
          }
        />
        {dashboard.lastTrackingAt ? (
          <span className="anr-icenter__clock">
            Last crawl{" "}
            <ClientTime iso={dashboard.lastTrackingAt} preset="datetime" />
          </span>
        ) : null}
      </header>

      {(!enabled || !providerConfigured) && (
        <AdminCard title="Setup" className="anr-icenter__card">
          <p className="anr-meta">
            Set <code>SEO_SERP_TRACKER=true</code> and configure{" "}
            <code>SERPAPI_KEY</code> (preferred) or{" "}
            <code>GOOGLE_CSE_API_KEY</code> + <code>GOOGLE_CSE_CX</code>.
            Runs twice daily via cron.
          </p>
        </AdminCard>
      )}

      <div className="anr-kpis anr-icenter__kpis">
        <article className="anr-kpi anr-icenter__kpi">
          <span>Visibility Score</span>
          <strong>{dashboard.visibilityScore}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Avg Position</span>
          <strong>{dashboard.averagePosition ?? "—"}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Keywords Tracked</span>
          <strong>{dashboard.keywordsTracked}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Ranking</span>
          <strong>{dashboard.keywordsRanking}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Opportunities</span>
          <strong className="anr-kpi--warn">
            {opportunities.length}
          </strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Top Competitors</span>
          <strong>{dashboard.topCompetitors.length}</strong>
        </article>
      </div>

      <div className="anr-icenter__layout">
        <AdminCard title="Biggest winners" className="anr-icenter__card">
          {dashboard.biggestWinners.length === 0 ? (
            <p className="anr-meta">No rank improvements yet.</p>
          ) : (
            <ul className="anr-icenter__list">
              {dashboard.biggestWinners.map((w) => (
                <li key={`${w.keyword}-${w.url}`}>
                  <strong>{w.keyword}</strong>
                  <span>
                    #{w.previous_position} → #{w.current_position} (+{w.position_delta})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Biggest losers" className="anr-icenter__card">
          {dashboard.biggestLosers.length === 0 ? (
            <p className="anr-meta">No rank drops detected.</p>
          ) : (
            <ul className="anr-icenter__list">
              {dashboard.biggestLosers.map((l) => (
                <li key={`${l.keyword}-${l.url}`}>
                  <strong>{l.keyword}</strong>
                  <span>
                    #{l.previous_position} → #{l.current_position} ({l.position_delta})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <AdminCard title="Jandarpan rankings" className="anr-icenter__card">
        {dashboard.jandarpanRankings.length === 0 ? (
          <EmptyState
            title="No rankings yet"
            hint="Run the SERP tracker after configuring an API provider."
          />
        ) : (
          <ul className="anr-icenter__list">
            {dashboard.jandarpanRankings.slice(0, 15).map((r) => (
              <li key={`${r.keyword}-${r.url}`}>
                <strong>
                  #{r.position} {r.keyword}
                </strong>
                <span>
                  {r.group_name}
                  {r.position_delta !== null && r.position_delta !== 0
                    ? ` · ${r.position_delta > 0 ? "+" : ""}${r.position_delta}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title="Top competitors" className="anr-icenter__card">
        <ul className="anr-icenter__list">
          {dashboard.topCompetitors.map((c) => (
            <li key={c.domain}>
              <strong>{c.competitor_name}</strong>
              <span>
                Top 10: {c.share_top10}% · Top 3: {c.share_top3}% · avg #
                {c.average_position}
              </span>
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminCard title="SERP feature ownership" className="anr-icenter__card">
        {dashboard.serpFeatureOwnership.length === 0 ? (
          <p className="anr-meta">No SERP features captured yet.</p>
        ) : (
          <ul className="anr-icenter__list">
            {dashboard.serpFeatureOwnership.map((f) => (
              <li key={f.feature}>
                <strong>{f.feature.replace(/_/g, " ")}</strong>
                <span>
                  {f.appearance_rate}% appearance · {f.recommendation}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title="Keyword trends" className="anr-icenter__card">
        <ul className="anr-icenter__list">
          {dashboard.keywordTrends.slice(0, 20).map((t) => (
            <li key={t.keyword}>
              <strong>{t.keyword}</strong>
              <span>
                {t.group_name} ·{" "}
                {t.current_position !== null
                  ? `#${t.current_position}`
                  : "not ranking"}{" "}
                · {t.movement.replace(/_/g, " ")}
              </span>
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminCard title="Top opportunities" className="anr-icenter__card">
        {opportunities.length === 0 ? (
          <EmptyState
            title="No opportunities yet"
            hint="Opportunities appear after the first SERP crawl completes."
          />
        ) : (
          <ul className="anr-icenter__list">
            {opportunities.map((opp, idx) => (
              <li key={`${opp.keyword_id}-${idx}`} data-priority={opp.priority}>
                <strong>
                  [{opp.priority}] {opp.title}
                </strong>
                <span>{opp.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title="Add custom keyword" className="anr-icenter__card">
        <form onSubmit={handleAddKeyword} className="anr-meta">
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              placeholder="Keyword to track"
              aria-label="Custom keyword"
              style={{ flex: 1, minWidth: "12rem" }}
            />
            <input
              type="text"
              value={customGroup}
              onChange={(e) => setCustomGroup(e.target.value)}
              placeholder="Group name"
              aria-label="Keyword group"
              style={{ minWidth: "8rem" }}
            />
            <button type="submit" disabled={adding || !customKeyword.trim()}>
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}
