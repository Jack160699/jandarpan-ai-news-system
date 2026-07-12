"use client";

import { LiveBadge } from "./LiveBadge";

export type LiveCounterProps = {
  count: number;
  total?: number;
  label?: string;
};

export function LiveCounter({
  count,
  total,
  label = "developing",
}: LiveCounterProps) {
  const display =
    total !== undefined && total !== count
      ? `${count} of ${total} ${label}`
      : count > 0
        ? `${count} ${label}`
        : "Latest";

  return (
    <div className="lv3-counter" role="status" aria-live="polite">
      <span className="lv3-counter__label">{display}</span>
      {count > 0 ? <LiveBadge variant="compact" pulse /> : null}
    </div>
  );
}
