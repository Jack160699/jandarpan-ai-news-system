/**
 * Exact news_events columns the editorial candidate pass needs.
 *
 * The worker used select("*") on the top-80 events every wake (~268 KB, mostly clustering_metadata at ~3 KB/row:
 * sources, title variants, merge history). Candidate ranking only reads clustering_metadata for a media hint that the
 * batch path always overrides with a signal-derived set, so the column is not transferred (an empty object keeps the
 * NewsEventRow shape).
 */

import type { NewsEventRow } from "@/lib/types/newsroom";

export const EDITORIAL_EVENT_COLUMNS =
  "id,tenant_id,canonical_title,event_summary,region,category,urgency_score,source_count,signal_ids,coverage_slug,coverage_headline,cluster_confidence,is_live,coverage_status,created_at,updated_at";

export function hydrateEditorialEvents(rows: unknown[] | null | undefined): NewsEventRow[] {
  return (rows ?? []).map((r) => ({ ...(r as Omit<NewsEventRow, "clustering_metadata">), clustering_metadata: {} }) as NewsEventRow);
}

export type EditorialCandidatePool = {
  events: NewsEventRow[];
  /** rows per tier group as returned by the database */
  groups: Record<string, number>;
  /** total source text per event (chars) -- events below the floor are never returned */
  evidenceChars: Map<string, number>;
};

/** Recency window of the candidate pool: the freshness gate rejects source evidence older than 72 h. */
export const CANDIDATE_POOL_WINDOW_HOURS = 96;

/**
 * Coverage-policy slate straight from the database (migration 096): primary-district events first, important statewide /
 * other-district / national events after, plus recently-updated published events for the bounded update pass.
 * Returns null when the function is unavailable (migration not applied) so the caller can fall back to the legacy read.
 */
export async function fetchEditorialCandidatePool(
  supabase: { rpc: (fn: never, args: never) => PromiseLike<{ data: unknown; error: { message: string } | null }> },
  now: number = Date.now()
): Promise<EditorialCandidatePool | null> {
  const since = new Date(now - CANDIDATE_POOL_WINDOW_HOURS * 3_600_000).toISOString();
  const { data, error } = await supabase.rpc("jd_editorial_candidate_events" as never, { p_since: since } as never);
  if (error) return null;
  const rows = (data ?? []) as Array<Record<string, unknown> & { grp: string; id: string; evidence_chars: number }>;
  const groups: Record<string, number> = {};
  const evidenceChars = new Map<string, number>();
  const seen = new Set<string>();
  const events: NewsEventRow[] = [];
  for (const r of rows) {
    groups[r.grp] = (groups[r.grp] ?? 0) + 1;
    if (seen.has(r.id)) continue; // an event belongs to exactly one tier group, but never trust the caller's assumption
    seen.add(r.id);
    evidenceChars.set(r.id, Number(r.evidence_chars ?? 0));
    const { grp: _g, evidence_chars: _e, ...row } = r;
    void _g;
    void _e;
    events.push(...hydrateEditorialEvents([{ ...row, urgency_score: Number(row.urgency_score), cluster_confidence: row.cluster_confidence == null ? null : Number(row.cluster_confidence) }]));
  }
  return { events, groups, evidenceChars };
}
