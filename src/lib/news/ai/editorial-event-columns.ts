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
