import { MetricTrend } from "../components/MetricTrend";
import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

export type EngagementWidgetProps = {
  data: ExecutiveAnalyticsData["engagement"];
};

export function EngagementWidget({ data }: EngagementWidgetProps) {
  return (
    <WidgetShell title="Engagement" subtitle="Reader interaction quality" span="kpi">
      <div className="av3-score-ring" aria-label={`Engagement score ${data.score} out of 100`}>
        <svg viewBox="0 0 80 80" className="av3-score-ring__svg" aria-hidden>
          <circle cx="40" cy="40" r="34" className="av3-score-ring__track" />
          <circle
            cx="40"
            cy="40"
            r="34"
            className="av3-score-ring__fill"
            strokeDasharray={`${(data.score / 100) * 213.6} 213.6`}
          />
        </svg>
        <strong className="av3-score-ring__value">{data.score}</strong>
      </div>
      <ul className="av3-metric-list">
        {data.metrics.map((metric) => (
          <li key={metric.label}>
            <span className="av3-metric-list__label">{metric.label}</span>
            <span className="av3-metric-list__value">{metric.value}</span>
            {metric.trend ? <MetricTrend trend={metric.trend} className="av3-metric-list__trend" /> : null}
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
