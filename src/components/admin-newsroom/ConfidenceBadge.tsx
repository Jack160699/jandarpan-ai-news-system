type ConfidenceBadgeProps = {
  score: number | null;
};

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  if (score == null) return <span className="anr-conf anr-conf--empty">—</span>;
  const pct = Math.round(score * 100);
  const tier = score >= 0.75 ? "high" : score >= 0.5 ? "mid" : "low";
  return (
    <span className={`anr-conf anr-conf--${tier}`}>
      <span className="anr-conf__dot" aria-hidden />
      {pct}%
    </span>
  );
}
