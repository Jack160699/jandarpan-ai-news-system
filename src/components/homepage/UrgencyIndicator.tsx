import type { HomeUrgency } from "@/lib/homepage/types";

type UrgencyIndicatorProps = {
  level: HomeUrgency;
  label?: string;
};

const LABELS: Record<HomeUrgency, string> = {
  high: "High priority",
  medium: "Updating",
  low: "Standard",
};

export function UrgencyIndicator({ level, label }: UrgencyIndicatorProps) {
  return (
    <span
      className={`hp-urgency hp-urgency--${level}`}
      title={label ?? LABELS[level]}
      aria-label={label ?? LABELS[level]}
    />
  );
}
