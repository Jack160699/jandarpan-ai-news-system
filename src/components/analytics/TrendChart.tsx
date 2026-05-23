"use client";

import type { TrendPoint } from "@/lib/analytics/types";

type TrendChartProps = {
  series: TrendPoint[];
};

export function TrendChart({ series }: TrendChartProps) {
  if (!series.length) {
    return <p className="anr-meta">No trend data in this window yet.</p>;
  }

  const maxViews = Math.max(...series.map((p) => p.views), 1);

  return (
    <div className="nra-chart" role="img" aria-label="Views and clicks over time">
      {series.map((p) => (
        <div key={p.label} className="nra-chart__bar-wrap">
          <div
            className="nra-chart__bar"
            style={{ height: `${Math.max(4, (p.views / maxViews) * 100)}%` }}
            title={`${p.views} views`}
          />
          <div
            className="nra-chart__bar nra-chart__bar--clicks"
            style={{
              height: `${Math.max(2, (p.clicks / maxViews) * 80)}%`,
            }}
            title={`${p.clicks} clicks`}
          />
          <span className="nra-chart__label">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
