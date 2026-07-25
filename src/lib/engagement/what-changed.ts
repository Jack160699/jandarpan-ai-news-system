/**
 * Diff continuing-coverage timeline against last-read cursor.
 */

import type { ContinuingCoverageVm } from "@/lib/events/continuing-coverage";

export type WhatChangedUpdate = {
  id: string;
  headline: string;
  whatChanged: string | null;
  sortAt: string;
  href: string;
  timeLabel: string;
};

export type WhatChangedModel = {
  eventId: string;
  updateCount: number;
  updates: WhatChangedUpdate[];
  timelineHref: string | null;
};

function formatClock(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/**
 * Return updates published after the reader's last visit to this event/story.
 * Empty when nothing new — caller should hide the panel.
 */
export function buildWhatChanged(
  coverage: ContinuingCoverageVm | null | undefined,
  lastReadAt: string | null | undefined
): WhatChangedModel | null {
  if (!coverage?.showTimeline || !lastReadAt) return null;
  const lastMs = new Date(lastReadAt).getTime();
  if (!Number.isFinite(lastMs)) return null;

  const newer = coverage.items
    .filter((item) => {
      if (item.isCurrent) return false;
      const t = new Date(item.sortAt).getTime();
      return Number.isFinite(t) && t > lastMs;
    })
    .sort((a, b) => a.sortAt.localeCompare(b.sortAt));

  if (!newer.length) return null;

  return {
    eventId: coverage.eventId,
    updateCount: newer.length,
    updates: newer.slice(0, 6).map((item) => ({
      id: item.id,
      headline: item.headline,
      whatChanged: item.whatChanged,
      sortAt: item.sortAt,
      href: item.href,
      timeLabel: formatClock(item.sortAt),
    })),
    timelineHref: coverage.nav.overviewHref ?? `#coverage-${coverage.eventId}`,
  };
}
