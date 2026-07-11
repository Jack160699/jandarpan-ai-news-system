import { MetricTrend } from "../components/MetricTrend";
import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

function formatCount(n: number) {
  return n.toLocaleString("en-IN");
}

export type AIUsageWidgetProps = {
  data: ExecutiveAnalyticsData["aiUsage"];
};

export function AIUsageWidget({ data }: AIUsageWidgetProps) {
  return (
    <WidgetShell title="AI Usage" subtitle="Reader-facing AI features today">
      <div className="av3-ai-summary">
        {data.summary.map((metric) => (
          <div key={metric.label} className="av3-ai-summary__item">
            <span className="av3-ai-summary__label">{metric.label}</span>
            <strong className="av3-ai-summary__value">{metric.value}</strong>
            {metric.sublabel ? (
              <span className="av3-ai-summary__sub">{metric.sublabel}</span>
            ) : null}
          </div>
        ))}
      </div>
      <dl className="av3-stat-pair av3-stat-pair--inline">
        <div>
          <dt>Requests</dt>
          <dd>{formatCount(data.requestsToday)}</dd>
        </div>
        <div>
          <dt>Tokens</dt>
          <dd>{formatCount(data.tokensToday)}</dd>
        </div>
      </dl>
      <MetricTrend trend={data.trend} />
    </WidgetShell>
  );
}
