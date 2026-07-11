"use client";

import type { LiveBadgeProps } from "../types";

export type { LiveBadgeProps };

export function LiveBadge({
  label = "Live",
  variant = "default",
  pulse = true,
}: LiveBadgeProps) {
  return (
    <span
      className={`lv3-badge lv3-badge--${variant}${pulse ? " lv3-badge--pulse" : ""}`}
      aria-label={label}
    >
      <span className="lv3-badge__dot" aria-hidden />
      <span className="lv3-badge__label">{label}</span>
    </span>
  );
}
