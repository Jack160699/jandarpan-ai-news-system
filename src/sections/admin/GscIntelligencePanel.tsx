"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GscDashboard, GscPageRecord, GscQueryRecord } from "@/lib/gsc-intelligence/types";
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
  formatShortPath,
} from "@/components/admin-v3";

type GscPayload = {
  ok: boolean;
  enabled: boolean;
  credentialsConfigured: boolean;
  dashboard: GscDashboard;
};

function chartInsight(data: Array<{ clicks: number; impressions: number }>): string | null {
  if (data.length < 2) return null;
  const first = data[0]!;
  const last = data[data.length - 1]!;
  const clickDelta = last.clicks - first.clicks;
  const impDelta = last.impressions - first.impressions;
  const clickWord = clickDelta >= 0 ? "up" : "down";
  const impWord = impDelta >= 0 ? "up" : "down";
  return `Chart span: clicks ${clickWord} ${Math.abs(clickDelta).toLocaleString()} (${first.clicks.toLocaleString()} to ${last.clicks.toLocaleString()}); impressions ${impWord} ${Math.abs(impDelta).toLocaleString()}.`;
}

export function GscIntelligencePanel() {
  const [dashboard, setDashboard] = useState<GscDashboard | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo/search-console", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as GscPayload & { error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load Search Console data");
        return;
      }
      setDashboard(json.dashboard);
      setEnabled(json.enabled);
      setCredentialsConfigured(json.credentialsConfigured);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const chartData = useMemo(
    () =>
      (dashboard?.growthCharts ?? []).map((d) => ({
        date: d.metric_date.slice(5),
        clicks: d.clicks,
        impressions: d.impressions,
      })),
    [dashboard]
  );

  const insight = useMemo(() => chartInsight(chartData), [chartData]);

  if (loading && !dashboard) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={4} />
        <Av3Skeleton className="av3-skeleton--block" style={{ minHeight: 220 }} />
      </Av3Stack>
    );
  }

  if (error && !dashboard) {
    return <Av3EmptyState title="Search Console offline" message={error} />;
  }

  if (!dashboard) return null;

  if (!enabled || !credentialsConfigured) {
    return (
      <Av3EmptyState
        title="Search Console not configured"
        message="Set SEO_GSC_ENGINE=true and configure GSC_SERVICE_ACCOUNT_JSON or GSC_REFRESH_TOKEN with Google OAuth. Add the service account in Search Console."
      />
    );
  }

  return (
    <Av3Stack>
      <Av3MetricGrid>
        <Av3Metric label="Clicks (28d)" value={dashboard.clicks.toLocaleString()} hint="Search property" />
        <Av3Metric label="Impressions" value={dashboard.impressions.toLocaleString()} hint="Search property" />
        <Av3Metric label="CTR" value={`${dashboard.ctr}%`} hint="Average click-through" />
        <Av3Metric label="Avg position" value={dashboard.averagePosition} hint="Search average" />
        <Av3Metric
          label="7d click delta"
          value={
            dashboard.trends.days7.clicks_delta >= 0
              ? `+${dashboard.trends.days7.clicks_delta}`
              : String(dashboard.trends.days7.clicks_delta)
          }
          hint={dashboard.trends.days7.label}
        />
        <Av3Metric label="CTR opportunities" value={dashboard.ctrOpportunities.length} hint="Recommendations" />
      </Av3MetricGrid>

      {insight ? <p className="av3-insight">{insight}</p> : null}

      <Av3Panel
        title="Performance"
        subtitle={
          dashboard.lastSyncAt
            ? `Last sync ${new Date(dashboard.lastSyncAt).toLocaleString()}`
            : "Daily metrics trend"
        }
      >
        {chartData.length === 0 ? (
          <Av3EmptyState title="No chart data yet" message="Run the GSC sync to populate daily metrics." />
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Av3Panel>

      <Av3Panel title="Top queries" subtitle="Highest click volume">
        <Av3DataTable<GscQueryRecord>
          columns={[
            { key: "query", header: "Query", render: (row) => row.query },
            { key: "clicks", header: "Clicks", numeric: true, render: (row) => row.clicks.toLocaleString() },
            { key: "impressions", header: "Impressions", numeric: true, render: (row) => row.impressions.toLocaleString() },
            { key: "ctr", header: "CTR", numeric: true, render: (row) => `${row.ctr}%` },
            { key: "position", header: "Position", numeric: true, render: (row) => `#${row.position}` },
            {
              key: "trend",
              header: "Status",
              render: (row) => <Av3StatusBadge status={row.trend} label={row.trend} />,
            },
          ]}
          rows={dashboard.topQueries.slice(0, 12)}
          rowKey={(row) => row.query}
          empty={<p className="av3-note">No query data yet.</p>}
        />
      </Av3Panel>

      <Av3Panel title="Top pages" subtitle="Landing pages with search visibility">
        <Av3DataTable<GscPageRecord>
          columns={[
            {
              key: "page_url",
              header: "Page",
              url: true,
              render: (row) => {
                const label = row.generated_article_slug ?? formatShortPath(row.page_url);
                return <span title={row.page_url}>{label}</span>;
              },
            },
            { key: "clicks", header: "Clicks", numeric: true, render: (row) => row.clicks.toLocaleString() },
            { key: "ctr", header: "CTR", numeric: true, render: (row) => `${row.ctr}%` },
            { key: "position", header: "Position", numeric: true, render: (row) => `#${row.position}` },
          ]}
          rows={dashboard.topPages.slice(0, 10)}
          rowKey={(row) => row.page_url}
          empty={<p className="av3-note">No page data yet.</p>}
        />
      </Av3Panel>
    </Av3Stack>
  );
}
