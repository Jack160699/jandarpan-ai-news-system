"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import type { AutonomousDashboard, SeoAction } from "@/lib/seo-autonomous/types";

type AutonomousPayload = {
  ok: boolean;
  enabled: boolean;
  dashboard: AutonomousDashboard;
};

const STATUS_COLORS: Record<string, string> = {
  succeeded: "var(--anr-success)",
  failed: "var(--anr-danger)",
  pending: "var(--anr-warning)",
  executing: "var(--anr-info)",
  rolled_back: "var(--anr-muted)",
  skipped: "var(--anr-muted)",
};

export function AutonomousSeoPanel() {
  const [dashboard, setDashboard] = useState<AutonomousDashboard | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo/autonomous", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as AutonomousPayload & { error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load autonomous SEO dashboard");
        return;
      }
      setDashboard(json.dashboard);
      setEnabled(json.enabled);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), 60_000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [refresh]);

  if (loading) {
    return <EmptyState title="Loading autonomous SEO…" hint="Pipeline dashboard" />;
  }

  if (error) {
    return <EmptyState title="Autonomous SEO offline" hint={error} />;
  }

  if (!dashboard) return null;

  const healthColor =
    dashboard.pipelineHealth === "healthy"
      ? "var(--anr-success)"
      : dashboard.pipelineHealth === "degraded"
        ? "var(--anr-warning)"
        : "var(--anr-muted)";

  return (
    <div className="anr-icenter">
      <div className="anr-icenter__terminal-bar">
        <LiveIndicator label={enabled ? "Autonomous active" : "Engine disabled"} />
        <span style={{ color: healthColor }}>
          Pipeline: {dashboard.pipelineHealth}
        </span>
        <ClientTime />
      </div>

      {!enabled && (
        <AdminCard title="Setup" className="anr-icenter__card">
          <p>
            Set <code>SEO_AUTONOMOUS_ENGINE=true</code> and ensure{" "}
            <code>SEO_EXECUTION_ENGINE=true</code>. Runs every 6 hours via cron.
            Only safe SEO metadata is modified — no article body or publishing changes.
          </p>
        </AdminCard>
      )}

      <div className="anr-kpis anr-icenter__kpis">
        <div className="anr-kpi">
          <span className="anr-kpi__label">Actions Executed</span>
          <span className="anr-kpi__value">{dashboard.actionsExecuted}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Success Rate</span>
          <span className="anr-kpi__value">{dashboard.successRate}%</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Failures</span>
          <span className="anr-kpi__value">{dashboard.failures}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Learning Samples</span>
          <span className="anr-kpi__value">{dashboard.learningProgress}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">CTR Gain</span>
          <span className="anr-kpi__value">{dashboard.ctrGain}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Traffic Gain</span>
          <span className="anr-kpi__value">{dashboard.trafficGain}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Ranking Gain</span>
          <span className="anr-kpi__value">{dashboard.rankingGain}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Rollbacks</span>
          <span className="anr-kpi__value">{dashboard.rollbackCount}</span>
        </div>
      </div>

      <AdminCard title="Pipeline Stages" className="anr-icenter__card">
        <div className="anr-icenter__list">
          {Object.entries(dashboard.stageHealth).map(([stage, health]) => (
            <div key={stage} className="anr-icenter__list-item">
              <span>{stage}</span>
              <span
                style={{
                  color:
                    health === "ok"
                      ? "var(--anr-success)"
                      : health === "error"
                        ? "var(--anr-danger)"
                        : "var(--anr-muted)",
                }}
              >
                {health}
              </span>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Recent Actions" className="anr-icenter__card">
        {dashboard.recentActions.length === 0 ? (
          <p>No autonomous actions yet. Pipeline runs every 6 hours.</p>
        ) : (
          <div className="anr-icenter__list">
            {dashboard.recentActions.map((action: SeoAction) => (
              <div key={action.id} className="anr-icenter__list-item">
                <div>
                  <strong>{action.field_key}</strong>
                  <span className="anr-muted"> — {action.article_slug}</span>
                  <br />
                  <small>{action.reason}</small>
                </div>
                <span style={{ color: STATUS_COLORS[action.status] ?? "inherit" }}>
                  {action.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard title="Pipeline Flow" className="anr-icenter__card">
        <p>
          Observe → Analyze → Generate Actions → Policy Validation → Execute →
          Verify → Measure → Learn
        </p>
        <p className="anr-muted">
          Each stage is isolated. Failures do not stop the pipeline. Rollback via
          execution history snapshots.
        </p>
      </AdminCard>
    </div>
  );
}
