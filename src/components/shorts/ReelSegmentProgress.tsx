"use client";

type ReelSegmentProgressProps = {
  total: number;
  activeIndex: number;
  progressPct: number;
};

/** Instagram-style segmented progress for multi-slide reels */
export function ReelSegmentProgress({
  total,
  activeIndex,
  progressPct,
}: ReelSegmentProgressProps) {
  if (total <= 1) {
    return (
      <div className="reel-segments reel-segments--single" aria-hidden>
        <span className="reel-segments__bar">
          <span style={{ width: `${progressPct}%` }} />
        </span>
      </div>
    );
  }

  return (
    <div
      className="reel-segments"
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
          <span key={i} className="reel-segments__segment">
            <span style={{ width: `${fill}%` }} />
          </span>
        );
      })}
    </div>
  );
}
