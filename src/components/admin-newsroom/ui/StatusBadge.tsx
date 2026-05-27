type StatusBadgeTone = "pending" | "approved" | "rejected" | "breaking" | "neutral";

type StatusBadgeProps = {
  label?: string;
  /** @deprecated Use `label` */
  status?: string;
  tone?: StatusBadgeTone;
};

export function StatusBadge({ label, status, tone = "neutral" }: StatusBadgeProps) {
  const resolved = label ?? status ?? "";
  return (
    <span className={`anr-badge ${tone !== "neutral" ? `anr-badge--${tone}` : ""}`}>
      {resolved}
    </span>
  );
}
