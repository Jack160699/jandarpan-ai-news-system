"use client";

import { memo } from "react";

type LiveBlinkProps = {
  className?: string;
  /** Stronger pulse on active district card */
  intense?: boolean;
  label?: string;
};

export const LiveBlink = memo(function LiveBlink({
  className = "",
  intense = false,
  label = "Live",
}: LiveBlinkProps) {
  return (
    <span
      className={`live-blink ${intense ? "live-blink--intense" : ""} ${className}`.trim()}
      aria-hidden={label ? undefined : true}
    >
      <span className="live-blink__dot" />
      {label ? <span className="live-blink__label">{label}</span> : null}
    </span>
  );
});
