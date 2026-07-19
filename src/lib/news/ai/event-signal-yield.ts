/**
 * Generation-yield contract: classify missing-signal cases and keep
 * auto-generation focused on events whose signal rows still exist.
 */

import type { NewsEventRow } from "@/lib/types/newsroom";

/** Primary auto-generation lookback window. */
export const AUTO_GENERATION_MAX_AGE_HOURS = 7 * 24;

/** Events older than this with dangling signal IDs are obsolete, not retryable. */
export const OBSOLETE_DANGLING_SIGNAL_AGE_HOURS = 72;

export type NoSignalsClass =
  | "retryable_dependency_gap"
  | "obsolete_dangling_signals"
  | "empty_signal_ids"
  | "already_resolved";

export type NoSignalsClassification = {
  class: NoSignalsClass;
  reason: string;
  retryable: boolean;
  ageHours: number;
  listedSignalIds: number;
  foundSignalIds: number;
};

export function eventAgeHours(
  event: Pick<NewsEventRow, "created_at">,
  nowMs = Date.now()
): number {
  const created = new Date(event.created_at).getTime();
  if (!Number.isFinite(created)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - created) / 3_600_000);
}

export function isWithinAutoGenerationWindow(
  event: Pick<NewsEventRow, "created_at" | "is_live">,
  nowMs = Date.now(),
  maxAgeHours = AUTO_GENERATION_MAX_AGE_HOURS
): boolean {
  if (event.is_live) return true;
  return eventAgeHours(event, nowMs) <= maxAgeHours;
}

/**
 * Classify why loadSignalsForEvent returned empty.
 * Does not invent relationships — only interprets listed vs found counts.
 */
export function classifyNoSignalsForEvent(input: {
  event: Pick<NewsEventRow, "created_at" | "is_live" | "signal_ids">;
  foundSignalCount: number;
  nowMs?: number;
}): NoSignalsClassification {
  const nowMs = input.nowMs ?? Date.now();
  const listed = input.event.signal_ids?.length ?? 0;
  const found = Math.max(0, input.foundSignalCount);
  const ageHours = eventAgeHours(input.event, nowMs);

  if (found > 0) {
    return {
      class: "already_resolved",
      reason: "signals_present",
      retryable: false,
      ageHours,
      listedSignalIds: listed,
      foundSignalIds: found,
    };
  }

  if (listed === 0) {
    const recent = ageHours <= OBSOLETE_DANGLING_SIGNAL_AGE_HOURS || input.event.is_live;
    return {
      class: recent ? "retryable_dependency_gap" : "empty_signal_ids",
      reason: recent ? "empty_signal_ids_awaiting_cluster" : "empty_signal_ids_obsolete",
      retryable: recent,
      ageHours,
      listedSignalIds: listed,
      foundSignalIds: found,
    };
  }

  // Listed IDs but none resolve in news_signals → dangling references.
  const obsolete =
    !input.event.is_live && ageHours >= OBSOLETE_DANGLING_SIGNAL_AGE_HOURS;

  return {
    class: obsolete ? "obsolete_dangling_signals" : "retryable_dependency_gap",
    reason: obsolete
      ? "dangling_signal_ids_obsolete"
      : "dangling_signal_ids_recent",
    retryable: !obsolete,
    ageHours,
    listedSignalIds: listed,
    foundSignalIds: found,
  };
}

/** Keep events that still resolve at least one signal row. */
export function filterEventsWithResolvableSignals<T extends { id: string }>(
  events: T[],
  foundCountByEventId: Map<string, number>
): T[] {
  return events.filter((e) => (foundCountByEventId.get(e.id) ?? 0) > 0);
}

export function uniqueSignalIds(events: Pick<NewsEventRow, "signal_ids">[]): string[] {
  const set = new Set<string>();
  for (const event of events) {
    for (const id of event.signal_ids ?? []) {
      if (id) set.add(id);
    }
  }
  return [...set];
}

export function countFoundSignalsPerEvent(
  events: Pick<NewsEventRow, "id" | "signal_ids">[],
  existingSignalIds: Set<string>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const event of events) {
    let found = 0;
    for (const id of event.signal_ids ?? []) {
      if (existingSignalIds.has(id)) found += 1;
    }
    map.set(event.id, found);
  }
  return map;
}
