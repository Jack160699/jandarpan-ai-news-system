import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

const STATUS_LABEL: Record<ExecutiveAnalyticsData["liveStatus"]["overall"], string> = {
  live: "All systems live",
  degraded: "Partial degradation",
  offline: "Service disruption",
};

export type LiveStatusWidgetProps = {
  data: ExecutiveAnalyticsData["liveStatus"];
  updatedAt: string;
};

export function LiveStatusWidget({ data, updatedAt }: LiveStatusWidgetProps) {
  return (
    <WidgetShell
      title="Live Status"
      subtitle={STATUS_LABEL[data.overall]}
      span="wide"
      action={
        <span className={`av3-status-pill av3-status-pill--${data.overall}`}>
          {data.overall}
        </span>
      }
    >
      <ul className="av3-live-list">
        {data.items.map((item) => (
          <li key={item.id} className={`av3-live-list__item av3-live-list__item--${item.status}`}>
            <span className="av3-live-list__dot" aria-hidden />
            <div>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </div>
            <span className="av3-live-list__status">{item.status}</span>
          </li>
        ))}
      </ul>
      <p className="av3-updated">
        Last updated{" "}
        <time dateTime={updatedAt}>
          {new Date(updatedAt).toLocaleString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "numeric",
            month: "short",
          })}
        </time>
      </p>
    </WidgetShell>
  );
}
