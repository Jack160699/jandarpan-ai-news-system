"use client";

import { memo, useMemo, useState } from "react";
import type { ExecutiveDashboard } from "@/lib/observability/executive-dashboard";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Period = 7 | 14 | 30;

function sliceTrend<T extends { date: string }>(data: T[], days: Period): T[] {
  return data.slice(-days);
}

function DualTooltip({
  active,
  payload,
  label,
  rate,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  rate: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ecfo__chart-tooltip">
      <p className="ecfo__chart-tooltip-date">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ${Number(p.value).toFixed(4)} (₹{(Number(p.value) * rate).toFixed(2)})
        </p>
      ))}
    </div>
  );
}

type Props = { data: ExecutiveDashboard };

export const ExecutiveCfoCharts = memo(function ExecutiveCfoCharts({ data: d }: Props) {
  const [period, setPeriod] = useState<Period>(14);
  const rate = d.exchangeRate;

  const costData = useMemo(() => sliceTrend(d.trends.cost, period), [d.trends.cost, period]);
  const savingsData = useMemo(() => sliceTrend(d.trends.savings, period), [d.trends.savings, period]);
  const tokenData = useMemo(() => sliceTrend(d.trends.tokens, period), [d.trends.tokens, period]);

  const todaySpend = costData[costData.length - 1]?.usd ?? 0;
  const yesterdaySpend = costData[costData.length - 2]?.usd ?? 0;
  const spendDelta =
    yesterdaySpend > 0
      ? Math.round(((todaySpend - yesterdaySpend) / yesterdaySpend) * 1000) / 10
      : null;

  return (
    <div className="ecfo__charts-v2">
      <div className="ecfo__chart-controls" role="group" aria-label="Chart time range">
        {([7, 14, 30] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={`ecfo__chart-period${period === p ? " is-active" : ""}`}
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
          >
            {p === 7 ? "7-day" : p === 14 ? "14-day" : "30-day"}
          </button>
        ))}
        {spendDelta != null ? (
          <span className="ecfo__chart-compare" aria-live="polite">
            Today vs yesterday: {spendDelta >= 0 ? "+" : ""}
            {spendDelta}%
          </span>
        ) : null}
      </div>

      <div className="ecfo__charts-scroll">
        <div className="ecfo__charts-grid">
          <div className="ecfo__card ecfo__card--chart">
            <h4>AI Spend</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costData}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip content={<DualTooltip rate={rate} />} />
                  <Area
                    type="monotone"
                    dataKey="usd"
                    name="Spend"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#spendGrad)"
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ecfo__card ecfo__card--chart">
            <h4>Cost Savings</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={savingsData}>
                  <defs>
                    <linearGradient id="saveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip content={<DualTooltip rate={rate} />} />
                  <Bar dataKey="usd" name="Saved" fill="url(#saveGrad)" radius={[6, 6, 0, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ecfo__card ecfo__card--chart">
            <h4>Usage Volume</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tokenData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip {...CHART_STYLE} />
                  <Line type="monotone" dataKey="input" name="Input" stroke="#6366f1" strokeWidth={2} dot={false} animationDuration={600} />
                  <Line type="monotone" dataKey="output" name="Output" stroke="#8b5cf6" strokeWidth={2} dot={false} animationDuration={600} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ecfo__card ecfo__card--chart">
            <h4>Spend Forecast</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sliceTrend(d.trends.forecast, period)}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip content={<DualTooltip rate={rate} />} />
                  <Line type="monotone" dataKey="projectedUsd" name="Projected" stroke="#f59e0b" strokeWidth={2} dot={false} animationDuration={600} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ecfo__card ecfo__card--chart">
            <h4>Backlog Trend</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sliceTrend(d.trends.queue, period)}>
                  <defs>
                    <linearGradient id="queueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip {...CHART_STYLE} />
                  <Area type="monotone" dataKey="pending" name="Pending" stroke="#ef4444" fill="url(#queueGrad)" animationDuration={600} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ecfo__card ecfo__card--chart">
            <h4>Efficiency Return</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sliceTrend(d.trends.roi, period)}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip {...CHART_STYLE} />
                  <Line type="monotone" dataKey="roi" name="ROI %" stroke="#10b981" strokeWidth={2} dot={false} connectNulls animationDuration={600} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const CHART_STYLE = {
  contentStyle: {
    background: "rgba(10,10,14,0.95)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    fontSize: 12,
  },
};
