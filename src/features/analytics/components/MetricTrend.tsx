import type { AnalyticsTrend } from "../types";
import { cn } from "@/design-system/utils/cn";

export type MetricTrendProps = {
  trend: AnalyticsTrend;
  className?: string;
};

export function MetricTrend({ trend, className }: MetricTrendProps) {
  const icon = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const tone =
    trend.direction === "up"
      ? "av3-trend--up"
      : trend.direction === "down"
        ? "av3-trend--down"
        : "av3-trend--flat";

  return (
    <span className={cn("av3-trend", tone, className)}>
      <span aria-hidden>{icon}</span>
      {trend.direction !== "flat" ? (
        <strong>{Math.abs(trend.value).toFixed(1)}%</strong>
      ) : (
        <strong>—</strong>
      )}
      <span className="av3-trend__label">{trend.label}</span>
    </span>
  );
}
