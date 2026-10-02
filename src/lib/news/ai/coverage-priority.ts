/**
 * Editorial coverage policy (2026-10-02) -- which stories get the scarce AI budget, in what order.
 *
 *   1  fresh stories from the four PRIMARY districts: Raipur, Durg (incl. Bhilai), Bilaspur, Rajnandgaon
 *   2  important statewide Chhattisgarh stories
 *   3  important stories from other Chhattisgarh districts
 *   4  major national stories (incl. national stories relevant to Chhattisgarh)
 *   5  major international stories
 *
 * Tiers 2-5 are only offered when the story is "important" (corroborated by >= 2 sources, urgent, or live), so low-signal
 * newswire volume can never fill the slate. UNKNOWN geography is never a candidate (it is quarantined at publication).
 * Pure and deterministic: no database access. Safety / quality / geography / language / dedupe gates are untouched.
 */

import { classifyGeoScope, type GeoScope } from "@/lib/news/geo/geo-scope";
import type { NewsEventRow } from "@/lib/types/newsroom";

export type CoverageRank = 1 | 2 | 3 | 4 | 5 | 6;

export const PRIMARY_DISTRICT_SLUGS: ReadonlySet<string> = new Set(["raipur", "durg", "bilaspur", "rajnandgaon"]);

/** Above every other score component (live 1,000 + breaking 200 + media 500 + freshness 120 + ...), so tier order is strict. */
export const COVERAGE_TIER_SCORE_STEP = 100_000;

/** urgency_score is 0..100 as written by the clusterer. */
export const IMPORTANT_URGENCY = 60;

export type EventCoverage = {
  rank: CoverageRank;
  scope: GeoScope;
  districtSlug: string | null;
  important: boolean;
};

type EventLike = Pick<
  NewsEventRow,
  "canonical_title" | "event_summary" | "region" | "category" | "source_count" | "urgency_score" | "is_live"
>;

export function isImportantEvent(e: Pick<EventLike, "source_count" | "urgency_score" | "is_live">): boolean {
  return (e.source_count ?? 1) >= 2 || Number(e.urgency_score ?? 0) >= IMPORTANT_URGENCY || Boolean(e.is_live);
}

export function classifyEventCoverage(e: EventLike): EventCoverage {
  const geo = classifyGeoScope({
    title: e.canonical_title,
    description: e.event_summary,
    region: e.region,
    category: e.category,
  });
  const important = isImportantEvent(e);
  let rank: CoverageRank;
  switch (geo.scope) {
    case "DISTRICT_SPECIFIC":
      rank = geo.districtSlug && PRIMARY_DISTRICT_SLUGS.has(geo.districtSlug) ? 1 : 3;
      break;
    case "STATEWIDE_CHHATTISGARH":
      rank = 2;
      break;
    case "INDIA_RELEVANT_TO_CHHATTISGARH":
    case "NATIONAL":
      rank = 4;
      break;
    case "INTERNATIONAL":
      rank = 5;
      break;
    default:
      rank = 6; // UNKNOWN
  }
  return { rank, scope: geo.scope, districtSlug: geo.districtSlug, important };
}

/** Primary-district stories always qualify; every other tier needs the story to be important; UNKNOWN never qualifies. */
export function isCoverageEligible(c: EventCoverage): boolean {
  if (c.rank === 6) return false;
  return c.rank === 1 || c.important;
}

export type CoveragePolicyResult<T> = {
  kept: T[];
  coverage: Map<string, EventCoverage>;
  dropped: { unknown_geography: number; not_important: number };
};

export function applyCoveragePolicy<T extends EventLike & { id: string }>(events: T[]): CoveragePolicyResult<T> {
  const coverage = new Map<string, EventCoverage>();
  const kept: T[] = [];
  const dropped = { unknown_geography: 0, not_important: 0 };
  for (const e of events) {
    const c = classifyEventCoverage(e);
    coverage.set(e.id, c);
    if (isCoverageEligible(c)) kept.push(e);
    else if (c.rank === 6) dropped.unknown_geography++;
    else dropped.not_important++;
  }
  return { kept, coverage, dropped };
}

/** Score added by scoreEditorialCandidate so the slate is ordered by tier first. */
export function coverageTierScore(rank: CoverageRank | undefined): number {
  return rank ? (6 - rank) * COVERAGE_TIER_SCORE_STEP : 0;
}
