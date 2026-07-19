import type { LaunchHealthWidget } from "@/lib/ops/launch-health";
import { Av3HealthRow, Av3Panel } from "@/components/admin-v3";

function tone(
  status: LaunchHealthWidget["status"]
): "healthy" | "warning" | "critical" | "neutral" {
  if (status === "healthy") return "healthy";
  if (status === "degraded") return "warning";
  if (status === "unhealthy") return "critical";
  return "neutral";
}

function label(status: string): string {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Warning";
  if (status === "unhealthy") return "Critical";
  return "Unknown";
}

type LaunchHealthSummaryStripProps = {
  widgets: LaunchHealthWidget[];
};

export function LaunchHealthSummaryStrip({ widgets }: LaunchHealthSummaryStripProps) {
  if (!widgets.length) return null;

  return (
    <Av3Panel title="Launch health" subtitle="Queues, cron, RSS, sitemap">
      <ul className="av3-stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {widgets.map((widget) => (
          <Av3HealthRow
            key={widget.id}
            label={widget.label}
            tone={tone(widget.status)}
            statusLabel={label(widget.status)}
            message={widget.detail}
          />
        ))}
      </ul>
    </Av3Panel>
  );
}
