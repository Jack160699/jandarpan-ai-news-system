"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExecutiveDashboard } from "@/lib/observability/executive-dashboard";
import {
  Av3DataTable,
  Av3EmptyState,
  Av3Metric,
  Av3MetricGrid,
  Av3Panel,
  Av3SkeletonGrid,
  Av3Stack,
  Av3StatusBadge,
  Av3Tabs,
  truncateText,
} from "@/components/admin-v3";
import {
  budgetPct,
  buildExecutiveAlerts,
  formatMoney,
  projectedMonthEnd,
} from "@/sections/admin/executive-cfo-helpers";

export function ExecutiveCostDashboard() {
  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ops/executive", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load executive dashboard");
        return;
      }
      setData(json.dashboard as ExecutiveDashboard);
      setError(null);
    } catch {
      setError("Network error loading executive dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const alerts = useMemo(() => (data ? buildExecutiveAlerts(data) : []), [data]);
  const projected = useMemo(() => (data ? projectedMonthEnd(data) : null), [data]);
  const budgetUsed = useMemo(() => (data ? budgetPct(data) : 0), [data]);

  if (loading && !data) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={5} />
      </Av3Stack>
    );
  }

  if (error && !data) {
    return <Av3EmptyState title="Executive cost dashboard unavailable" message={error} />;
  }

  if (!data) return null;

  const budgetLimit = formatMoney(data.budgetSimulator.selectedBudgetUsd, data.exchangeRate);
  const topModels = [...data.modelAnalytics].sort((a, b) => b.spend.usd - a.spend.usd).slice(0, 8);

  return (
    <Av3Stack>
      <Av3Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "details", label: "Details" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" ? (
        <>
          <Av3MetricGrid>
            <Av3Metric label="Spend today" value={data.overview.todaySpend.usdLabel} hint={data.overview.todaySpend.inrLabel} />
            <Av3Metric label="Spend this month" value={data.overview.monthlySpend.usdLabel} hint={data.overview.monthlySpend.inrLabel} />
            <Av3Metric
              label="Projected month end"
              value={projected?.usdLabel ?? "—"}
              hint={projected?.inrLabel ?? "Based on recent burn"}
            />
            <Av3Metric label="Monthly budget" value={budgetLimit.usdLabel} hint={`${Math.round(budgetUsed)}% used`} />
            <Av3Metric label="Budget remaining" value={data.overview.budgetRemaining.usdLabel} hint={data.overview.budgetRemaining.inrLabel} />
            <Av3Metric label="Money saved" value={data.overview.moneySaved.usdLabel} hint="Optimizations + cache" />
          </Av3MetricGrid>

          <Av3Panel title="Warnings and anomalies" subtitle="Budget, queue, and spend alerts">
            {alerts.filter((a) => a.category !== "healthy").length === 0 && data.anomalies.length === 0 ? (
              <p className="av3-note">No active warnings.</p>
            ) : (
              <ul className="anr-dense-list">
                {alerts
                  .filter((a) => a.category !== "healthy")
                  .map((a) => (
                    <li key={a.id}>
                      <span>{a.title}</span>
                      <Av3StatusBadge
                        tone={a.category === "immediate" ? "critical" : "warning"}
                        label={a.category}
                      />
                    </li>
                  ))}
                {data.anomalies.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <span>{truncateText(a.message, 72)}</span>
                    <Av3StatusBadge tone={a.severity === "critical" ? "critical" : "warning"} label={a.severity} />
                  </li>
                ))}
              </ul>
            )}
          </Av3Panel>
        </>
      ) : (
        <>
          <Av3Panel title="Cost by task" subtitle="Worker spend">
            <Av3DataTable
              columns={[
                { key: "label", header: "Task", render: (row) => row.label },
                { key: "cost", header: "Spend", numeric: true, render: (row) => row.cost.usdLabel },
                { key: "tokens", header: "Tokens", numeric: true, render: (row) => row.tokens.toLocaleString() },
                { key: "retries", header: "Retries", numeric: true, render: (row) => row.retries },
              ]}
              rows={data.workerFinancials}
              rowKey={(row) => row.worker}
              empty={<p className="av3-note">No worker spend recorded yet.</p>}
            />
          </Av3Panel>

          <Av3Panel title="Cost by model" subtitle="Provider model breakdown">
            <Av3DataTable
              columns={[
                { key: "model", header: "Model", render: (row) => row.model },
                { key: "spend", header: "Spend", numeric: true, render: (row) => row.spend.usdLabel },
                { key: "tokens", header: "Tokens", numeric: true, render: (row) => row.tokens.toLocaleString() },
                {
                  key: "successRate",
                  header: "Success",
                  numeric: true,
                  render: (row) => `${row.successRate}%`,
                },
              ]}
              rows={data.modelAnalytics}
              rowKey={(row) => row.model}
              empty={<p className="av3-note">No model usage recorded yet.</p>}
            />
          </Av3Panel>

          <Av3Panel title="Highest-cost models" subtitle="Top spend drivers">
            <Av3DataTable
              columns={[
                { key: "model", header: "Model", render: (row) => row.model },
                { key: "spend", header: "Spend", numeric: true, render: (row) => row.spend.usdLabel },
                {
                  key: "avgLatencyMs",
                  header: "Avg latency",
                  numeric: true,
                  render: (row) => `${Math.round(row.avgLatencyMs / 1000)}s`,
                },
              ]}
              rows={topModels}
              rowKey={(row) => row.model}
              empty={<p className="av3-note">No expensive model activity yet.</p>}
            />
          </Av3Panel>
        </>
      )}

      <p className="av3-note">
        Updated {new Date(data.generatedAt).toLocaleString()} · Auto-refresh 60s
      </p>
    </Av3Stack>
  );
}
