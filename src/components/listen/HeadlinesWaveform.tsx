"use client";

import type { CSSProperties } from "react";

type HeadlinesWaveformProps = {
  active?: boolean;
  bars?: number;
  className?: string;
};

export function HeadlinesWaveform({
  active = false,
  bars = 28,
  className = "",
}: HeadlinesWaveformProps) {
  return (
    <div
      className={`hl-wave ${active ? "hl-wave--active" : ""} ${className}`.trim()}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="hl-wave__bar"
          style={{ "--hl-bar-i": i } as CSSProperties}
        />
      ))}
    </div>
  );
}
