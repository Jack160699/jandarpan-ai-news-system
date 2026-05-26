type StatusBadgeTone = "pending" | "approved" | "rejected" | "breaking" | "neutral";

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`anr-badge ${tone !== "neutral" ? `anr-badge--${tone}` : ""}`}>{label}</span>;
}
