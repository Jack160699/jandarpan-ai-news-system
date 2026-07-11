"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import type { SeoIntelligenceDashboard } from "@/lib/seo-intelligence/types";

type IntelligencePayload = {
  ok: boolean;
  enabled: boolean;
  dashboard: SeoIntelligenceDashboard;
};

type RecommendationsPayload = {
  ok: boolean;
  recommendations: SeoIntelligenceDashboard["recommendations"];
};

export function SeoIntelligencePanel() {
  const [dashboard, setDashboard] = useState<SeoIntelligenceDashboard | null>(
    null
  );
  const [enabled, setEnabled] = useState(false);
  const [recommendations, setRecommendations] = useState<
    SeoIntelligenceDashboard["recommendations"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [intelRes, recRes] = await Promise.all([
        fetch("/api/admin/seo/intelligence", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/admin/seo/recommendations?limit=30", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const intelJson = (await intelRes.json()) as IntelligencePayload & {
        error?: string;
      };
      const recJson = (await recRes.json()) as RecommendationsPayload & {
        error?: string;
      };

      if (!intelRes.ok || !intelJson.ok) {
        setError(intelJson.error ?? "Failed to load SEO intelligence");
        return;
      }
      if (!recRes.ok || !recJson.ok) {
        setError(recJson.error ?? "Failed to load recommendations");
        return;
      }

      setDashboard(intelJson.dashboard);
      setEnabled(intelJson.enabled);
      setRecommendations(recJson.recommendations);
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

  if (loading && !dashboard) {
    return (
      <div className="anr-icenter">
        <div className="anr-skeleton" style={{ height: "14rem" }} />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="SEO intelligence offline" hint={error} />;
  }

  if (!dashboard) return null;

  return (
    <div className="anr-icenter">
      <header className="anr-icenter__terminal-bar">
        <div className="anr-icenter__brand">
          <span className="anr-icenter__dot" />
          <strong>SEO ENGINE</strong>
          <em>INTELLIGENCE</em>
        </div>
        <LiveIndicator label={enabled ? "Engine enabled" : "Engine disabled"} />
        {dashboard.lastAnalysisAt ? (
          <span className="anr-icenter__clock">
            Last analysis{" "}
            <ClientTime iso={dashboard.lastAnalysisAt} preset="datetime" />
          </span>
        ) : null}
      </header>

      {!enabled ? (
        <AdminCard title="Feature flag" className="anr-icenter__card">
          <p className="anr-meta">
            Set <code>SEO_INTELLIGENCE_ENGINE=true</code> on Vercel. Analysis
            runs 5 minutes after the competitor tracker cron.
          </p>
        </AdminCard>
      ) : null}

      <div className="anr-kpis anr-icenter__kpis">
        <article className="anr-kpi anr-icenter__kpi">
          <span>SEO Health</span>
          <strong>{dashboard.seoHealth}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Coverage %</span>
          <strong>{dashboard.coveragePercent}%</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Missing stories</span>
          <strong className="anr-kpi--warn">
            {dashboard.missingStories.length}
          </strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Competitor advantage</span>
          <strong>{dashboard.competitorAdvantage}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Trending keywords</span>
          <strong>{dashboard.trendingKeywords.length}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Recommendations</span>
          <strong>{recommendations.length}</strong>
        </article>
      </div>

      <div className="anr-icenter__layout">
        <AdminCard title="District coverage" className="anr-icenter__card">
          {dashboard.districtCoverage.length === 0 ? (
            <p className="anr-meta">No district gaps detected yet.</p>
          ) : (
            <ul className="anr-icenter__list">
              {dashboard.districtCoverage.slice(0, 8).map((d) => (
                <li key={d.district}>
                  <strong>{d.districtName}</strong>
                  <span>
                    {d.coveragePercent}% · missing {d.missingStories} ·{" "}
                    {d.recommendation}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Trending keywords" className="anr-icenter__card">
          <ul className="anr-icenter__list">
            {dashboard.trendingKeywords.slice(0, 10).map((k) => (
              <li key={k.keyword}>
                <strong>{k.keyword}</strong>
                <span>
                  {k.frequency}× · {k.trend} · {k.competitors_using.length}{" "}
                  competitors
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>

      <AdminCard title="Headline scores" className="anr-icenter__card">
        {dashboard.headlineScores.length === 0 ? (
          <p className="anr-meta">No headline improvements flagged.</p>
        ) : (
          <ul className="anr-icenter__list">
            {dashboard.headlineScores.slice(0, 8).map((h) => (
              <li key={h.headline}>
                <strong>{h.headline.slice(0, 80)}</strong>
                <span>
                  Score {h.headlineScore} · CTR {h.ctrPrediction} · SEO{" "}
                  {h.seoScore}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title="Recommendation feed" className="anr-icenter__card">
        {recommendations.length === 0 ? (
          <EmptyState
            title="No recommendations yet"
            hint="Run the SEO intelligence engine after competitor data is collected."
          />
        ) : (
          <ul className="anr-icenter__list">
            {recommendations.map((rec, idx) => (
              <li key={`${rec.type}-${idx}`} data-priority={rec.priority}>
                <strong>
                  [{rec.priority}] {rec.title}
                </strong>
                <span>{rec.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
