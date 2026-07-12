"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricTrend } from "../components/MetricTrend";
import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

const CHART_TOOLTIP = {
  contentStyle: {
    background: "rgba(12,12,16,0.95)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    fontSize: 12,
  },
};

function formatCount(n: number) {
  return n.toLocaleString("en-IN");
}

export type ReadersTodayWidgetProps = {
  data: ExecutiveAnalyticsData["readersToday"];
};

export function ReadersTodayWidget({ data }: ReadersTodayWidgetProps) {
  return (
    <WidgetShell title="Readers Today" subtitle="Unique readers since midnight" span="kpi">
      <div className="av3-kpi">
        <strong className="av3-kpi__value">{formatCount(data.total)}</strong>
        <MetricTrend trend={data.trend} />
      </div>
      <div className="av3-chart av3-chart--sm" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.sparkline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="av3ReadersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip {...CHART_TOOLTIP} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#av3ReadersGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetShell>
  );
}
