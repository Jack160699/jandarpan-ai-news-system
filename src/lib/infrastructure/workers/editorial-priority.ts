/**
 * Editorial candidate priority — deterministic scoring without DB access.
 * Balances live/breaking urgency, Chhattisgarh relevance, freshness, and
 * district/category diversity to reduce starvation.
 */

import { geoFromRecord } from "@/lib/regional/geo-tagging";
import { scoreRegionalTopic } from "@/lib/regional/topic-scoring";
import type { NewsEventRow } from "@/lib/types/newsroom";

export type EditorialCandidateContext = {
  recentDistrictCounts?: Record<string, number>;
  recentCategoryCounts?: Record<string, number>;
  nowMs?: number;
};

const LIVE_BOOST = 1_000;
const BREAKING_URGENCY_THRESHOLD = 8;
const BREAKING_BOOST = 200;

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

  const regional = scoreRegionalTopic({
    headline: event.canonical_title,
    summary: event.event_summary,
    region: event.region,
    category: event.category,
    geo: geoFromRecord(event),
  });
  score += Math.round(regional.score * 100);

  const ageMs = Math.max(0, nowMs - new Date(event.created_at).getTime());
  const ageHours = ageMs / 3_600_000;
  // Freshness boost for recent events (first ~48h).
  const freshness = Math.max(
    0,
    120 - Math.floor(ageMs / (48 * 3_600_000)) * 120
  );
  score += freshness;
  // Steep age penalty so high-urgency orphans (missing signals) cannot starve
  // fresh eligible events. ~200 pts per day beyond 48h.
  if (ageHours > 48) {
    score -= Math.floor((ageHours - 48) / 24) * 200;
  }
  // Hard exclusion band for auto-generation outside the live window.
  if (!event.is_live && ageHours > 7 * 24) {
    score -= 10_000;
  }

  const geo = geoFromRecord(event);
  const district = geo.primary_district ?? event.region ?? "unknown";
  const category = event.category ?? "general";
  const districtCount = context?.recentDistrictCounts?.[district] ?? 0;
  const categoryCount = context?.recentCategoryCounts?.[category] ?? 0;

  const districtBoost = districtCount === 0 ? 40 : Math.max(0, 35 - districtCount * 12);
  const categoryBoost = categoryCount === 0 ? 25 : Math.max(0, 20 - categoryCount * 8);
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
