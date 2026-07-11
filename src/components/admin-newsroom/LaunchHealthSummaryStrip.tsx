import type { LaunchHealthLevel, LaunchHealthWidget } from "@/lib/ops/launch-health";

const STATUS_CLASS: Record<LaunchHealthLevel, string> = {
  healthy: "anr-pulse-item--stable",
  degraded: "anr-pulse-item--warning",
  unhealthy: "anr-pulse-item--breaking",
};

function statusClass(status: LaunchHealthWidget["status"]): string {
  return STATUS_CLASS[status as LaunchHealthLevel] ?? "";
}

function statusLabel(status: LaunchHealthWidget["status"]): string {
  return STATUS_LABEL[status as LaunchHealthLevel] ?? status;
}

const STATUS_LABEL: Record<LaunchHealthLevel, string> = {
  healthy: "Green",
  degraded: "Yellow",
  unhealthy: "Red",
};

type LaunchHealthSummaryStripProps = {
  widgets: LaunchHealthWidget[];
};

export function LaunchHealthSummaryStrip({ widgets }: LaunchHealthSummaryStripProps) {
  if (!widgets.length) return null;

  return (
    <section className="anr-health-ops__launch-strip" aria-label="Launch health summary">
      <h3 className="anr-meta m-0 mb-3 font-bold uppercase tracking-wide">
        Launch health
      </h3>
      <ul className="anr-health-ops__launch-grid">
        {widgets.map((widget) => (
          <li
            key={widget.id}
            className={`anr-pulse-item ${statusClass(widget.status)}`}
            title={widget.detail}
          >
            <span className="anr-pulse-item__label">{widget.label}</span>
            <span className="anr-pulse-item__value">{statusLabel(widget.status)}</span>
            <span className="anr-meta block text-xs opacity-80">{widget.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
