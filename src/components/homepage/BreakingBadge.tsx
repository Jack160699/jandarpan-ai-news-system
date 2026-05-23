type BreakingBadgeVariant = "live" | "just-in" | "breaking" | "urgent";

type BreakingBadgeProps = {
  variant: BreakingBadgeVariant;
  className?: string;
};

const LABELS: Record<BreakingBadgeVariant, string> = {
  live: "LIVE",
  "just-in": "Just In",
  breaking: "Breaking",
  urgent: "Urgent",
};

export function BreakingBadge({ variant, className = "" }: BreakingBadgeProps) {
  return (
    <span
      className={`live-badge live-badge--${variant}${className ? ` ${className}` : ""}`}
    >
      {variant === "live" ? (
        <span className="live-badge__dot" aria-hidden />
      ) : null}
      {LABELS[variant]}
    </span>
  );
}
