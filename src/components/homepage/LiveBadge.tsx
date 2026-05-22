type LiveBadgeProps = {
  label?: string;
};

export function LiveBadge({ label = "Live" }: LiveBadgeProps) {
  return (
    <span className="hp-live">
      <span className="hp-live__dot" aria-hidden />
      {label}
    </span>
  );
}
