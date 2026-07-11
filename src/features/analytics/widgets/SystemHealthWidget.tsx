import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

export type SystemHealthWidgetProps = {
  data: ExecutiveAnalyticsData["systemHealth"];
};

export function SystemHealthWidget({ data }: SystemHealthWidgetProps) {
  return (
    <WidgetShell
      title="System Health"
      subtitle="Infrastructure checks"
      action={
        <span className={`av3-status-pill av3-status-pill--${data.overall === "healthy" ? "live" : data.overall === "degraded" ? "degraded" : "offline"}`}>
          {data.overall}
        </span>
      }
    >
      <ul className="av3-health-list">
        {data.checks.map((check) => (
          <li key={check.id} className={`av3-health-list__item av3-health-list__item--${check.status}`}>
            <span className="av3-health-list__dot" aria-hidden />
            <span className="av3-health-list__label">{check.label}</span>
            {check.latencyMs != null ? (
              <span className="av3-health-list__latency">{check.latencyMs}ms</span>
            ) : null}
            <span className="av3-health-list__status">{check.status}</span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
