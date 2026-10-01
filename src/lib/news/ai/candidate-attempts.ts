/**
 * Persistent failed-candidate tracking for editorial generation.
 *
 * Without this, an event whose generation fails (model returns unusable output, hard quality reject, …) is
 * re-attempted — and re-billed — on every run until it ages out of the candidate window. Each countable failure
 * now increments `editorial_candidate_attempts`, pushes the next eligible time out exponentially, and after
 * MAX_CANDIDATE_ATTEMPTS the event is dead-lettered (never auto-retried; visible for manual review).
 *
 * Infrastructure/governor outcomes (quota deferral, run budget, provider outage) are NOT candidate failures and
 * are never counted. Everything here is best-effort and fail-open: if the table or RPC is missing (migration 089
 * not applied yet) or the DB errors, generation proceeds exactly as before.
 */

import { createAdminServerClient } from "@/lib/supabase";
import { normalizeTitle } from "@/lib/news/normalize";

export const MAX_CANDIDATE_ATTEMPTS = 4;
export const CANDIDATE_BACKOFF_BASE_MS = 15 * 60_000;
export const CANDIDATE_BACKOFF_MAX_MS = 12 * 3_600_000;

/** Backoff before the Nth failure's retry: 15m, 30m, 60m, … capped at 12h. Mirrors the SQL function. */
export function candidateBackoffMs(attempts: number): number {
  const n = Math.max(1, Math.floor(attempts));
  return Math.min(CANDIDATE_BACKOFF_MAX_MS, CANDIDATE_BACKOFF_BASE_MS * 2 ** (n - 1));
}

export function isDeadLettered(attempts: number): boolean {
  return attempts >= MAX_CANDIDATE_ATTEMPTS;
}

/** Governor / infrastructure outcomes that say nothing about the event itself. */
const NON_COUNTABLE_REASONS = new Set([
  "DEFERRED_QUOTA",
  "RUN_BUDGET_EXHAUSTED",
  "slug_already_exists",
  "no_ai_provider_configured",
  "no_signals_for_event",
]);

export function isCountableCandidateFailure(reason: string | undefined | null): boolean {
  if (!reason) return false;
  if (NON_COUNTABLE_REASONS.has(reason)) return false;
  if (reason.startsWith("ai_")) return false;
  // A retryable structural failure is still a real failed attempt; quarantine/hard-reject are countable too.
  return true;
}

export type CandidateAttemptState = {
  attempts: number;
  nextRetryAt: number | null;
  deadLettered: boolean;
};

type AttemptRow = {
  event_id: string;
  attempts: number;
  next_retry_at: string | null;
  dead_lettered_at: string | null;
};

/** Is this row currently blocked from generation? Pure — unit tested. */
export function isCandidateBlocked(state: CandidateAttemptState, now: number = Date.now()): boolean {
  if (state.deadLettered) return true;
  return state.nextRetryAt !== null && state.nextRetryAt > now;
}

/** Map of eventId → state for events that have a failure history (others are absent). Fail-open: {} on error. */
export async function loadCandidateAttemptStates(
  eventIds: string[]
): Promise<Map<string, CandidateAttemptState>> {
  const out = new Map<string, CandidateAttemptState>();
  if (eventIds.length === 0) return out;
  try {
    const supabase = createAdminServerClient();
    // Chunk to keep the URL of the `in` filter bounded.
    for (let i = 0; i < eventIds.length; i += 200) {
      const { data, error } = await supabase
        .from("editorial_candidate_attempts" as never)
        .select("event_id,attempts,next_retry_at,dead_lettered_at")
        .in("event_id", eventIds.slice(i, i + 200));
      if (error) return out;
      for (const row of (data ?? []) as unknown as AttemptRow[]) {
        out.set(row.event_id, {
          attempts: row.attempts,
          nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at).getTime() : null,
          deadLettered: row.dead_lettered_at !== null,
        });
      }
    }
  } catch {
    return new Map();
  }
  return out;
}

/** Record one failed attempt (atomic increment + backoff + dead-letter in SQL). Never throws. */
export async function recordCandidateFailure(
  eventId: string,
  reason: string
): Promise<{ attempts: number; deadLettered: boolean } | null> {
  if (!isCountableCandidateFailure(reason)) return null;
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase.rpc("record_editorial_candidate_failure" as never, {
      p_event_id: eventId,
      p_reason: reason.slice(0, 500),
      p_max_attempts: MAX_CANDIDATE_ATTEMPTS,
      p_base_seconds: Math.round(CANDIDATE_BACKOFF_BASE_MS / 1000),
      p_max_seconds: Math.round(CANDIDATE_BACKOFF_MAX_MS / 1000),
    } as never);
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as
      | { attempts?: number; dead_lettered?: boolean }
      | null
      | undefined;
    if (!row || typeof row.attempts !== "number") return null;
    return { attempts: row.attempts, deadLettered: Boolean(row.dead_lettered) };
  } catch {
    return null;
  }
}

/** A published event no longer needs its failure history. */
export async function clearCandidateAttempts(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  try {
    const supabase = createAdminServerClient();
    await supabase
      .from("editorial_candidate_attempts" as never)
      .delete()
      .in("event_id", eventIds);
  } catch {
    /* best effort */
  }
}

/**
 * Story identity for backoff purposes: events are keyed by id, so two events for the SAME story (identical normalised
 * title) would otherwise each get their own retry budget and defeat the backoff / dead-letter. The clusterer no longer
 * creates such twins (migration 092), and this keeps the editorial slate safe from any that already exist.
 */
export function storyKey(title: string): string {
  return normalizeTitle(title).replace(/\s+/g, "");
}

/**
 * Drops events that are blocked themselves OR share a story key with a blocked event, then keeps only the first event
 * per story key (callers pass them best-first). Pure -- unit tested.
 */
export function selectUnblockedDistinctStories<T extends { id: string; canonical_title: string }>(
  events: T[],
  states: Map<string, CandidateAttemptState>,
  now: number = Date.now()
): T[] {
  const blockedKeys = new Set<string>();
  for (const e of events) {
    const st = states.get(e.id);
    if (st && isCandidateBlocked(st, now)) blockedKeys.add(storyKey(e.canonical_title));
  }
  const seen = new Set<string>();
  const out: T[] = [];
  for (const e of events) {
    const key = storyKey(e.canonical_title);
    if (blockedKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}
