import { confidenceLabel } from "@/lib/homepage/format";

type ConfidenceIndicatorProps = {
  score: number;
  showLabel?: boolean;
};

function tier(score: number): "high" | "mid" | "low" {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "mid";
  return "low";
}

export function ConfidenceIndicator({
  score,
  showLabel = true,
}: ConfidenceIndicatorProps) {
  const pct = Math.round(score * 100);
  const t = tier(score);

  return (
    <div
      className={`nr-confidence nr-confidence--${t}`}
      role="img"
      aria-label={`Editorial confidence ${pct} percent, ${confidenceLabel(score)}`}
    >
      <span className="nr-confidence__bar" aria-hidden>
        <span
          className="nr-confidence__fill"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </span>
      {showLabel ? (
        <span className="nr-confidence__label">{confidenceLabel(score)}</span>
      ) : null}
    </div>
  );
}
