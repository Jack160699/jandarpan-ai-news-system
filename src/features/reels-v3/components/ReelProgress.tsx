"use client";

type ReelProgressProps = {
  /** Overall progress through this reel, 0–100 */
  progressPct: number;
};

/**
 * Single thin progress line for the current reel — continuous vertical-feed
 * grammar, not segmented story bars.
 */
export function ReelProgress({ progressPct }: ReelProgressProps) {
  return (
    <div
      className="reels-v3-progress reels-v3-progress--single"
      role="progressbar"
      aria-valuenow={Math.round(progressPct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="reels-v3-progress__bar">
        <span
          className="reels-v3-progress__fill"
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
        />
      </span>
    </div>
  );
}
