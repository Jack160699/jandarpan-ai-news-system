/**
 * Editorial candidate priority — deterministic scoring without DB access.
 * Balances live/breaking urgency, Chhattisgarh relevance, freshness, and
 * district/category diversity to reduce starvation.
 */

import { geoFromRecord } from "@/lib/regional/geo-tagging";
import { scoreSearchOpportunity, type SearchOpportunity } from "@/lib/news/search-demand";
import type { NewsEventRow } from "@/lib/types/newsroom";

export type EditorialCandidateContext = {
  recentDistrictCounts?: Record<string, number>;
  recentCategoryCounts?: Record<string, number>;
  nowMs?: number;
  searchOpportunities?: SearchOpportunity[];
  /** Set of event IDs that have verified clean photojournalism media */
  eventsWithRealMedia?: Set<string>;
};

const LIVE_BOOST = 1_000;
const BREAKING_URGENCY_THRESHOLD = 8;
const BREAKING_BOOST = 200;
const REAL_MEDIA_BOOST = 500;
const NO_MEDIA_PENALTY = 500;
const CHHATTISGARH_BOOST = 150;
const MULTI_SOURCE_BOOST = 100;

export function scoreEditorialCandidate(
  event: NewsEventRow,
  context?: EditorialCandidateContext
): number {
  const nowMs = context?.nowMs ?? Date.now();
  let score = 0;

  if (event.is_live) {
    score += LIVE_BOOST;
  }

  if (event.urgency_score >= BREAKING_URGENCY_THRESHOLD) {
    score += BREAKING_BOOST;
  }

  score += event.urgency_score * 25;

  // Media-first candidate selection: genuine photojournalism receives a dominant boost
  const hasRealMedia =
    context?.eventsWithRealMedia?.has(event.id) ??
    (Boolean((event.clustering_metadata as any)?.has_real_image) ||
      Boolean((event.clustering_metadata as any)?.sample_image_url));

  if (hasRealMedia) {
    score += REAL_MEDIA_BOOST;
  } else if (context?.eventsWithRealMedia) {
    score -= NO_MEDIA_PENALTY;
  }

  // Multi-source verification boost
  if ((event.source_count ?? 1) >= 2) {
    score += MULTI_SOURCE_BOOST;
  }

  // High clustering confidence boost
  if ((event.cluster_confidence ?? 0) >= 0.8) {
    score += 50;
  }

  // Use Search Demand Engine to score the topic, replacing legacy regional scoring
  const searchDemand = scoreSearchOpportunity(
    {
      id: event.id,
      category: event.category ?? "general",
      region: event.region ?? "unknown",
      urgencyScore: event.urgency_score ?? 0,
    },
    context?.searchOpportunities ?? []
  );
  
  score += Math.round(searchDemand.score * 100);

  const ageMs = Math.max(0, nowMs - new Date(event.created_at).getTime());
  const ageHours = ageMs / 3_600_000;
  // Freshness boost for recent events (first ~48h).
  const freshness = Math.max(
    0,
    120 - Math.floor(ageMs / (48 * 3_600_000)) * 120
  );
  score += freshness;
  // Steep age penalty so high-urgency orphans cannot starve fresh eligible events.
  // ~200 pts per day beyond 48h.
  if (ageHours > 48) {
    score -= Math.floor((ageHours - 48) / 24) * 200;
  }
  // Hard exclusion band for auto-generation outside the 14-day window.
  if (!event.is_live && ageHours > 14 * 24) {
    score -= 10_000;
  }

  const geo = geoFromRecord(event);
  const district = geo.primary_district ?? event.region ?? "unknown";
  const category = event.category ?? "general";
  const districtCount = context?.recentDistrictCounts?.[district] ?? 0;
  const categoryCount = context?.recentCategoryCounts?.[category] ?? 0;

  // Regional Chhattisgarh boost: Jan Darpan is rooted in Chhattisgarh photojournalism
  const isChhattisgarh =
    event.region === "chhattisgarh" ||
    geo.is_chhattisgarh ||
    (district !== "unknown" && district !== "india" && district !== "global");
  if (isChhattisgarh) {
    score += CHHATTISGARH_BOOST;
  }

  const districtBoost = districtCount === 0 ? 30 : Math.max(0, 25 - districtCount * 10);
  const categoryBoost = categoryCount === 0 ? 40 : Math.max(0, 35 - categoryCount * 8);
  score += districtBoost + categoryBoost;

  return score;
}

export function compareEditorialCandidates(
  a: NewsEventRow,
  b: NewsEventRow,
  context?: EditorialCandidateContext
): number {
  const scoreA = scoreEditorialCandidate(a, context);
  const scoreB = scoreEditorialCandidate(b, context);
  if (scoreB !== scoreA) return scoreB - scoreA;
  return a.id.localeCompare(b.id);
}

export function selectEditorialCandidates(
  events: NewsEventRow[],
  limit: number,
  context?: EditorialCandidateContext
): NewsEventRow[] {
  if (limit <= 0 || events.length === 0) return [];

  const selected: NewsEventRow[] = [];
  const districtCounts: Record<string, number> = {
    ...(context?.recentDistrictCounts ?? {}),
  };
  const categoryCounts: Record<string, number> = {
    ...(context?.recentCategoryCounts ?? {}),
  };
  const remaining = [...events];

  while (selected.length < limit && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidateScore = scoreEditorialCandidate(remaining[i], {
        ...context,
        recentDistrictCounts: districtCounts,
        recentCategoryCounts: categoryCounts,
      });
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestIdx = i;
      }
    }

    const picked = remaining.splice(bestIdx, 1)[0]!;
    selected.push(picked);

    const geo = geoFromRecord(picked);
    const district = geo.primary_district ?? picked.region ?? "unknown";
    const category = picked.category ?? "general";
    districtCounts[district] = (districtCounts[district] ?? 0) + 1;
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }

  return selected;
}

/** Maps editorial score to worker_jobs priority (0–100). */
export function editorialJobQueuePriority(
  event: NewsEventRow,
  context?: EditorialCandidateContext
): number {
  const raw = scoreEditorialCandidate(event, context);
  return Math.min(100, Math.max(0, Math.round(raw / 20)));
}
