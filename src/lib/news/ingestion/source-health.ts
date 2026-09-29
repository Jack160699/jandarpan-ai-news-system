/**
 * Source health model — derived from timestamps and counters, not from a stored label.
 *
 * Verified 2026-09-29: ingestion_source_state.health_state said "healthy" for feeds whose
 * last success was 9 days ago, whose newest item was from July/August, or that had returned
 * nothing new for 134 consecutive runs. A label that is only ever set to "healthy" on
 * success cannot say a feed has gone quiet. This module derives the status from the data and
 * also decides HOW OFTEN a feed is worth polling (adaptive backoff for feeds that keep
 * returning only duplicates), so dormant feeds stop consuming the ingest time budget.
 */

import type { IngestionSourceStateRow } from "@/lib/news/ingestion/source-state";

export type DerivedSourceStatus =
  | "healthy"
  | "degraded"
  | "dormant"
  | "rate_limited"
  | "failing"
  | "disabled"
  | "retired"
  | "orphaned"
  | "never_run";

export type DerivedSourceHealth = {
  status: DerivedSourceStatus;
  reason: string;
  /** Hours since a genuinely new item was last seen (null = never). */
  hoursSinceNewItem: number | null;
  /** Hours since the source last responded successfully (null = never). */
  hoursSinceSuccess: number | null;
};

const HOUR = 3_600_000;
const MIN = 60_000;

type StateLike = Pick<
  IngestionSourceStateRow,
  | "enabled"
  | "health_state"
  | "last_attempted_at"
  | "last_successful_at"
  | "last_new_item_at"
  | "last_item_timestamp"
  | "consecutive_failures"
  | "consecutive_empty_runs"
  | "disabled_until"
  | "quota_exhausted_until"
  | "rate_limited_until"
  | "retirement_reason"
>;

const t = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const v = new Date(iso).getTime();
  return Number.isFinite(v) ? v : null;
};

const hoursAgo = (iso: string | null | undefined, now: number): number | null => {
  const v = t(iso);
  return v === null ? null : Math.max(0, (now - v) / HOUR);
};

export function deriveSourceHealth(
  row: StateLike | null | undefined,
  options: { now?: number; known?: boolean } = {}
): DerivedSourceHealth {
  const now = options.now ?? Date.now();
  if (!row) {
    return { status: "never_run", reason: "no state recorded", hoursSinceNewItem: null, hoursSinceSuccess: null };
  }
  const hoursSinceNewItem = hoursAgo(row.last_new_item_at, now);
  const hoursSinceSuccess = hoursAgo(row.last_successful_at, now);
  const out = (status: DerivedSourceStatus, reason: string): DerivedSourceHealth => ({
    status,
    reason,
    hoursSinceNewItem,
    hoursSinceSuccess,
  });

  if (row.health_state === "permanently_retired") {
    return out("retired", row.retirement_reason ?? "permanently retired");
  }
  if (!row.enabled) return out("disabled", "disabled");
  if (options.known === false) return out("orphaned", "not in the configured source registry");

  const until = (v: string | null) => (t(v) ?? 0) > now;
  if (until(row.disabled_until)) return out("disabled", "temporarily disabled after failures");
  if (until(row.quota_exhausted_until)) return out("rate_limited", "provider quota exhausted");
  if (until(row.rate_limited_until)) return out("rate_limited", "rate limited");

  if ((row.consecutive_failures ?? 0) >= 3) {
    return out("failing", `${row.consecutive_failures} consecutive failures`);
  }

  const attemptedHours = hoursAgo(row.last_attempted_at, now);
  if (attemptedHours === null) return out("never_run", "never attempted");

  // A source not attempted for a long time is not "healthy" just because it was once.
  if (hoursSinceSuccess === null) return out("failing", "never succeeded");
  if (hoursSinceSuccess > 24) return out("degraded", `no successful fetch for ${Math.round(hoursSinceSuccess)}h`);

  // Responding but returning nothing new.
  if (hoursSinceNewItem === null || hoursSinceNewItem > 7 * 24) {
    return out("dormant", "no new items for 7+ days");
  }
  if ((row.consecutive_empty_runs ?? 0) >= 30 || hoursSinceNewItem > 72) {
    return out("degraded", `no new items for ${Math.round(hoursSinceNewItem)}h`);
  }
  return out("healthy", "producing new items");
}

/**
 * Minimum delay between polls of a source, given its recent behaviour.
 * Runs happen every ~10 min; a feed that keeps returning only duplicates is polled
 * progressively less often, and recovers to every-run polling as soon as it yields new items
 * (consecutive_empty_runs resets to 0).
 */
export function nextPollDelayMs(
  row: StateLike | null | undefined,
  options: { now?: number; highValue?: boolean } = {}
): number {
  if (!row) return 0;
  const now = options.now ?? Date.now();
  const empty = row.consecutive_empty_runs ?? 0;
  const failures = row.consecutive_failures ?? 0;

  let delay = 0;
  if (empty >= 30) delay = 6 * HOUR;
  else if (empty >= 12) delay = 3 * HOUR;
  else if (empty >= 6) delay = 1 * HOUR;
  else if (empty >= 3) delay = 20 * MIN;

  const newHours = hoursAgo(row.last_new_item_at, now);
  if (newHours === null || newHours > 7 * 24) delay = Math.max(delay, 12 * HOUR);

  if (failures >= 3) {
    delay = Math.max(delay, Math.min(6 * HOUR, 15 * MIN * 2 ** (failures - 3)));
  }

  // Direct Chhattisgarh publishers are the scarce, high-value supply: never poll them
  // less often than every 30 minutes.
  if (options.highValue) delay = Math.min(delay, 30 * MIN);
  return delay;
}

/** Whether a source is due for another poll now. */
export function shouldPollSource(
  row: StateLike | null | undefined,
  options: { now?: number; highValue?: boolean } = {}
): boolean {
  if (!row) return true;
  const now = options.now ?? Date.now();
  // The RSS path stamps last_successful_at on every successful poll but not always
  // last_attempted_at, so the most recent of the two is the last poll time.
  const attempts = [t(row.last_attempted_at), t(row.last_successful_at)].filter(
    (v): v is number => v !== null
  );
  if (!attempts.length) return true;
  const last = Math.max(...attempts);
  return now - last >= nextPollDelayMs(row, { ...options, now });
}

/** Status label used by the admin dashboard. */
export const SOURCE_STATUS_LABEL: Record<DerivedSourceStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  dormant: "Dormant",
  rate_limited: "Rate limited",
  failing: "Failing",
  disabled: "Disabled",
  retired: "Retired",
  orphaned: "Orphaned",
  never_run: "Never run",
};
