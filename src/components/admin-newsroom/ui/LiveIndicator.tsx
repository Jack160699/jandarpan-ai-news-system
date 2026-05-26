type LiveIndicatorProps = {
  label?: string;
};

export function LiveIndicator({ label = "Live" }: LiveIndicatorProps) {
  return (
    <span className="anr-live">
      <span className="anr-live-dot" aria-hidden />
      {label}
    </span>
  );
}
