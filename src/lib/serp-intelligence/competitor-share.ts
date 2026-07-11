/**
 * Module 4 — Competitor Share
 */

import type { CompetitorShareStats } from "@/lib/serp-intelligence/types";
import type { ExistingRankingState } from "@/lib/serp-intelligence/rank-tracker";
import {
  isJandarpanDomain,
  resolveCompetitorName,
} from "@/lib/serp-intelligence/parser";

export interface SnapshotRankingRow {
  domain: string;
  position: number;
  position_delta: number | null;
}

export function computeCompetitorShare(
  rankings: SnapshotRankingRow[],
  totalKeywords: number
): CompetitorShareStats[] {
  const byDomain = new Map<
    string,
    { top10: number; top3: number; positions: number[]; deltas: number[] }
  >();

  for (const row of rankings) {
    if (isJandarpanDomain(row.domain)) continue;
    const domain = row.domain;
    if (!byDomain.has(domain)) {
      byDomain.set(domain, { top10: 0, top3: 0, positions: [], deltas: [] });
    }
    const entry = byDomain.get(domain)!;
    if (row.position <= 10) entry.top10 += 1;
    if (row.position <= 3) entry.top3 += 1;
    entry.positions.push(row.position);
    if (row.position_delta !== null) entry.deltas.push(row.position_delta);
  }

  const stats: CompetitorShareStats[] = [];

  for (const [domain, data] of byDomain.entries()) {
    const avgPos =
      data.positions.reduce((a, b) => a + b, 0) / data.positions.length;
    const avgDelta =
      data.deltas.length > 0
        ? data.deltas.reduce((a, b) => a + b, 0) / data.deltas.length
        : 0;

    stats.push({
      domain,
      competitor_name: resolveCompetitorName(domain) ?? domain,
      top10_count: data.top10,
      top3_count: data.top3,
      share_top10: totalKeywords > 0 ? Math.round((data.top10 / totalKeywords) * 100) : 0,
      share_top3: totalKeywords > 0 ? Math.round((data.top3 / totalKeywords) * 100) : 0,
      average_position: Math.round(avgPos * 10) / 10,
      position_delta_avg: Math.round(avgDelta * 10) / 10,
    });
  }

  return stats.sort((a, b) => b.share_top10 - a.share_top10);
}

export function findMostVisibleCompetitor(
  stats: CompetitorShareStats[]
): CompetitorShareStats | null {
  return stats[0] ?? null;
}

export function findMostImprovedCompetitor(
  stats: CompetitorShareStats[]
): CompetitorShareStats | null {
  const improved = stats.filter((s) => s.position_delta_avg > 0);
  if (improved.length === 0) return null;
  return improved.sort((a, b) => b.position_delta_avg - a.position_delta_avg)[0];
}

export function aggregateRankingsFromSnapshots(
  keywordRankings: Map<string, ExistingRankingState[]>
): SnapshotRankingRow[] {
  const rows: SnapshotRankingRow[] = [];
  for (const rankings of keywordRankings.values()) {
    for (const r of rankings) {
      rows.push({
        domain: r.domain,
        position: r.position,
        position_delta: null,
      });
    }
  }
  return rows;
}
