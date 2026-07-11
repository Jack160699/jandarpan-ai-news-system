/**
 * Module 2 — Query Intelligence
 */

import { daysAgo, formatGscDate, querySearchAnalytics } from "@/lib/gsc-intelligence/client";
import {
  linkQueryToArticle,
} from "@/lib/gsc-intelligence/article-linker";
import type { ArticleLinkHint } from "@/lib/gsc-intelligence/types";
import type { GscQueryRecord, GscTrend } from "@/lib/gsc-intelligence/types";

function computeTrend(
  currentPosition: number,
  previousPosition: number | null
): GscTrend {
  if (previousPosition === null) return "stable";
  const delta = previousPosition - currentPosition;
  if (delta >= 1) return "rising";
  if (delta <= -1) return "declining";
  return "stable";
}

export async function collectQueryIntelligence(
  comparisonDays: number,
  rowLimit: number,
  articles: ArticleLinkHint[],
  now = new Date()
): Promise<GscQueryRecord[]> {
  const endDate = formatGscDate(now);
  const currentStart = daysAgo(comparisonDays, now);
  const previousEnd = daysAgo(comparisonDays + 1, now);
  const previousStart = daysAgo(comparisonDays * 2, now);

  const [currentRows, previousRows] = await Promise.all([
    querySearchAnalytics({
      startDate: currentStart,
      endDate,
      dimensions: ["query"],
      rowLimit,
    }),
    querySearchAnalytics({
      startDate: previousStart,
      endDate: previousEnd,
      dimensions: ["query"],
      rowLimit,
    }),
  ]);

  const previousByQuery = new Map(
    previousRows.map((r) => [r.keys[0] ?? "", r])
  );

  return currentRows.map((row) => {
    const query = row.keys[0] ?? "";
    const prev = previousByQuery.get(query);
    const previousPosition = prev ? prev.position : null;
    const positionDelta =
      previousPosition !== null ? previousPosition - row.position : null;
    const link = linkQueryToArticle(query, articles);

    return {
      query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 10000) / 100,
      position: Math.round(row.position * 10) / 10,
      previous_position: previousPosition,
      position_delta: positionDelta,
      trend: computeTrend(row.position, previousPosition),
      district: link.district ?? null,
      category: link.category ?? null,
      generated_article_id: link.id ?? null,
      generated_article_slug: link.slug ?? null,
      topic: link.topic ?? null,
      period_start: currentStart,
      period_end: endDate,
    };
  });
}
