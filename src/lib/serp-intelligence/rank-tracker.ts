/**
 * Module 3 — Rank Tracker
 * Detect position changes and maintain ranking history.
 */

import {
  isJandarpanDomain,
  resolveCompetitorName,
} from "@/lib/serp-intelligence/parser";
import type {
  SerpMovementRecord,
  SerpMovementType,
  SerpOrganicResult,
  SerpRankingRecord,
} from "@/lib/serp-intelligence/types";

export interface ExistingRankingState {
  url: string;
  domain: string;
  position: number;
  title: string | null;
  snippet: string | null;
  site: string | null;
  publish_date: string | null;
  is_jandarpan: boolean;
  competitor_key: string | null;
  first_seen: string;
  best_rank: number | null;
  worst_rank: number | null;
  ranking_history: Array<{ position: number; captured_at: string }>;
}

export function detectMovementType(
  previous: number | null,
  current: number | null
): SerpMovementType {
  if (previous === null && current !== null) return "new_ranking";
  if (previous !== null && current === null) return "lost_ranking";
  if (previous !== null && current !== null) {
    if (current < previous) return "improved_ranking";
    if (current > previous) return "dropped_ranking";
    return "unchanged";
  }
  return "unchanged";
}

export function buildRankingUpdate(
  keywordId: string,
  result: SerpOrganicResult,
  existing: ExistingRankingState | undefined,
  capturedAt: string
): { ranking: SerpRankingRecord; movement: SerpMovementRecord | null } {
  const domain = result.domain;
  const isJandarpan = isJandarpanDomain(domain);
  const competitorKey = isJandarpan ? null : resolveCompetitorName(domain);
  const previousPosition = existing?.position ?? null;
  const positionDelta =
    previousPosition !== null ? previousPosition - result.position : null;

  const history = [...(existing?.ranking_history ?? [])];
  history.push({ position: result.position, captured_at: capturedAt });
  const trimmedHistory = history.slice(-30);

  const bestRank = existing?.best_rank
    ? Math.min(existing.best_rank, result.position)
    : result.position;
  const worstRank = existing?.worst_rank
    ? Math.max(existing.worst_rank, result.position)
    : result.position;

  const movementType = detectMovementType(previousPosition, result.position);
  const movement: SerpMovementRecord | null =
    movementType === "unchanged"
      ? null
      : {
          keyword_id: keywordId,
          url: result.url,
          domain,
          movement_type: movementType,
          previous_position: previousPosition,
          current_position: result.position,
          position_delta: positionDelta,
          is_jandarpan: isJandarpan,
        };

  return {
    ranking: {
      keyword_id: keywordId,
      url: result.url,
      domain,
      title: result.title,
      snippet: result.snippet,
      site: result.site ?? domain,
      publish_date: result.publish_date ?? null,
      position: result.position,
      previous_position: previousPosition,
      position_delta: positionDelta,
      is_jandarpan: isJandarpan,
      competitor_key: competitorKey,
      first_seen: existing?.first_seen ?? capturedAt,
      last_seen: capturedAt,
      best_rank: bestRank,
      worst_rank: worstRank,
      ranking_history: trimmedHistory,
    },
    movement,
  };
}

export function detectLostRankings(
  keywordId: string,
  existingRankings: ExistingRankingState[],
  currentUrls: Set<string>,
  capturedAt: string
): SerpMovementRecord[] {
  const movements: SerpMovementRecord[] = [];

  for (const existing of existingRankings) {
    if (currentUrls.has(existing.url)) continue;
    movements.push({
      keyword_id: keywordId,
      url: existing.url,
      domain: existing.domain,
      movement_type: "lost_ranking",
      previous_position: existing.position,
      current_position: null,
      position_delta: null,
      is_jandarpan: existing.is_jandarpan,
      metadata: { lost_at: capturedAt },
    });
  }

  return movements;
}

export function computeVisibilityScore(
  jandarpanPositions: Array<number | null>
): number {
  if (jandarpanPositions.length === 0) return 0;

  let points = 0;
  for (const pos of jandarpanPositions) {
    if (pos !== null && pos >= 1 && pos <= 10) {
      points += 11 - pos;
    }
  }

  return Math.round((points / (jandarpanPositions.length * 10)) * 100);
}

export function computeAveragePosition(
  positions: Array<number | null>
): number | null {
  const ranked = positions.filter((p): p is number => p !== null && p > 0);
  if (ranked.length === 0) return null;
  const sum = ranked.reduce((acc, p) => acc + p, 0);
  return Math.round((sum / ranked.length) * 10) / 10;
}
