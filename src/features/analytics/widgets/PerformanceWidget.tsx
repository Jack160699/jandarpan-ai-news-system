import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

export type PerformanceWidgetProps = {
  data: ExecutiveAnalyticsData["performance"];
};

export function PerformanceWidget({ data }: PerformanceWidgetProps) {
  return (
    <WidgetShell title="Performance" subtitle={`Platform score ${data.score}/100`}>
      <div className="av3-perf-score">
        <div className="av3-perf-score__bar" role="meter" aria-valuenow={data.score} aria-valuemin={0} aria-valuemax={100}>
          <span className="av3-perf-score__fill" style={{ width: `${data.score}%` }} />
        </div>
        <strong className="av3-perf-score__value">{data.score}</strong>
      </div>
      <ul className="av3-perf-list">
        {data.metrics.map((metric) => (
          <li key={metric.label} className={`av3-perf-list__item av3-perf-list__item--${metric.status}`}>
            <span className="av3-perf-list__label">{metric.label}</span>
            <span className="av3-perf-list__value">{metric.value}</span>
            <span className="av3-perf-list__target">{metric.target}</span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
