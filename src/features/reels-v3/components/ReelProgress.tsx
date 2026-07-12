"use client";

type ReelProgressProps = {
  total: number;
  activeIndex: number;
  progressPct: number;
};

/**
 * JDP-017 — Segmented story progress (Instagram-style)
 */
export function ReelProgress({
  total,
  activeIndex,
  progressPct,
}: ReelProgressProps) {
  if (total <= 1) {
    return (
      <div className="reels-v3-progress reels-v3-progress--single" aria-hidden>
        <span className="reels-v3-progress__bar">
          <span
            className="reels-v3-progress__fill"
            style={{ width: `${progressPct}%` }}
          />
        </span>
      </div>
    );
  }

  return (
    <div
      className="reels-v3-progress"
      role="progressbar"
      aria-valuenow={Math.round(progressPct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Slide ${activeIndex + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        let fill = 0;
        if (i < activeIndex) fill = 100;
        else if (i === activeIndex) fill = progressPct;
        return (
          <span key={i} className="reels-v3-progress__segment">
            <span
              className="reels-v3-progress__fill"
              style={{ width: `${fill}%` }}
            />
          </span>
        );
      })}
    </div>
  );
}
