"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AutonomousDashboard,
  PipelineStage,
  SeoAction,
} from "@/lib/seo-autonomous/types";
import type { Av3TimelineStatus } from "@/components/admin-v3";
import {
  Av3DataTable,
  Av3EmptyState,
  Av3Metric,
  Av3MetricGrid,
  Av3Panel,
  Av3Skeleton,
  Av3SkeletonGrid,
  Av3Stack,
  Av3StatusBadge,
  Av3Timeline,
  formatShortPath,
  truncateText,
} from "@/components/admin-v3";

type AutonomousPayload = {
  ok: boolean;
  enabled: boolean;
  dashboard: AutonomousDashboard;
};

const STAGE_ORDER: Array<{ key: PipelineStage; label: string }> = [
  { key: "observe", label: "Observe" },
  { key: "analyze", label: "Analyse" },
  { key: "generate", label: "Generate" },
  { key: "policy", label: "Policy check" },
  { key: "execute", label: "Execute" },
  { key: "verify", label: "Verify" },
  { key: "measure", label: "Measure" },
  { key: "learn", label: "Learn" },
];

function stageTimelineStatus(
  health: AutonomousDashboard["stageHealth"][PipelineStage]
): Av3TimelineStatus {
  if (health === "ok") return "complete";
  if (health === "error") return "failed";
  return "pending";
}

function actionTone(status: SeoAction["status"]) {
  if (status === "succeeded") return "healthy" as const;
  if (status === "failed") return "critical" as const;
  if (status === "skipped") return "skipped" as const;
  if (status === "rolled_back") return "warning" as const;
  return "pending" as const;
}

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
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  if (loading && !dashboard) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={4} />
        <Av3Skeleton className="av3-skeleton--block" style={{ minHeight: 180 }} />
      </Av3Stack>
    );
  }

  if (error && !dashboard) {
    return <Av3EmptyState title="Autonomous SEO offline" message={error} />;
  }

  if (!dashboard) return null;

  const timelineStages = STAGE_ORDER.map(({ key, label }) => ({
    id: key,
    label,
    status: stageTimelineStatus(dashboard.stageHealth[key]),
    detail: dashboard.stageHealth[key],
  }));

  return (
    <Av3Stack>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <Av3StatusBadge status={dashboard.pipelineHealth} label={`Pipeline ${dashboard.pipelineHealth}`} />
        <Av3StatusBadge tone={enabled ? "healthy" : "neutral"} label={enabled ? "Engine enabled" : "Engine disabled"} />
      </div>

      {!enabled ? (
        <Av3EmptyState
          title="Autonomous SEO is disabled"
          message="Set SEO_AUTONOMOUS_ENGINE=true and SEO_EXECUTION_ENGINE=true. Runs every 6 hours via cron."
        />
      ) : null}

      <Av3MetricGrid>
        <Av3Metric label="Actions executed" value={dashboard.actionsExecuted} hint="Lifetime pipeline runs" />
        <Av3Metric label="Success rate" value={`${dashboard.successRate}%`} hint="Executed actions" />
        <Av3Metric label="Failures" value={dashboard.failures} hint="Failed executions" />
        <Av3Metric label="CTR gain" value={dashboard.ctrGain} hint="Measured uplift" />
        <Av3Metric label="Traffic gain" value={dashboard.trafficGain} hint="Measured uplift" />
        <Av3Metric label="Ranking gain" value={dashboard.rankingGain} hint="Measured uplift" />
        <Av3Metric label="Rollbacks" value={dashboard.rollbackCount} hint="Reverted changes" />
        <Av3Metric label="Learning samples" value={dashboard.learningProgress} hint="Feedback loop" />
      </Av3MetricGrid>

      <Av3Panel title="Pipeline stages" subtitle="Observe through Learn">
        <Av3Timeline stages={timelineStages} />
      </Av3Panel>

      <Av3Panel title="Recent actions" subtitle="Latest autonomous metadata changes">
        <Av3DataTable<SeoAction>
          columns={[
            { key: "field_key", header: "Action", render: (row) => row.field_key },
            {
              key: "article_slug",
              header: "Page",
              render: (row) => formatShortPath(row.article_slug || "/"),
            },
            {
              key: "reason",
              header: "Reason",
              truncate: true,
              render: (row) => truncateText(row.reason, 72),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <Av3StatusBadge tone={actionTone(row.status)} label={row.status} />,
            },
            {
              key: "executed_at",
              header: "Time",
              render: (row) =>
                row.executed_at || row.created_at
                  ? new Date(row.executed_at ?? row.created_at).toLocaleString()
                  : "—",
            },
          ]}
          rows={dashboard.recentActions}
          rowKey={(row) => row.id}
          empty={<p className="av3-note">No autonomous actions yet. Pipeline runs every 6 hours.</p>}
        />
      </Av3Panel>
    </Av3Stack>
  );
}
