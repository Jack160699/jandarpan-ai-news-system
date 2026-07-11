"use client";

import { MetricTrend } from "../components/MetricTrend";
import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

function formatCount(n: number) {
  return n.toLocaleString("en-IN");
}

export type ActiveUsersWidgetProps = {
  data: ExecutiveAnalyticsData["activeUsers"];
};

export function ActiveUsersWidget({ data }: ActiveUsersWidgetProps) {
  const pctOfPeak = Math.round((data.current / data.peak) * 100);

  return (
    <WidgetShell title="Active Users" subtitle="Concurrent readers right now" span="kpi">
      <div className="av3-kpi">
        <strong className="av3-kpi__value av3-kpi__value--live">{formatCount(data.current)}</strong>
        <span className="av3-live-pulse">Live</span>
      </div>
      <dl className="av3-stat-pair">
        <div>
          <dt>Peak today</dt>
          <dd>{formatCount(data.peak)}</dd>
        </div>
        <div>
          <dt>Of peak</dt>
          <dd>{pctOfPeak}%</dd>
        </div>
      </dl>
      <MetricTrend trend={data.trend} />
    </WidgetShell>
  );
}
