/**
 * Module 3 — Page Performance
 */

import { daysAgo, formatGscDate, querySearchAnalytics } from "@/lib/gsc-intelligence/client";
import {
  linkPageToArticle,
} from "@/lib/gsc-intelligence/article-linker";
import type { ArticleLinkHint } from "@/lib/gsc-intelligence/types";
import type { GscIndexedStatus, GscPageRecord } from "@/lib/gsc-intelligence/types";

export async function collectPagePerformance(
  comparisonDays: number,
  rowLimit: number,
  articles: ArticleLinkHint[],
  now = new Date()
): Promise<GscPageRecord[]> {
  const endDate = formatGscDate(now);
  const startDate = daysAgo(comparisonDays, now);

  const rows = await querySearchAnalytics({
    startDate,
    endDate,
    dimensions: ["page"],
    rowLimit,
  });

  return rows.map((row) => {
    const pageUrl = row.keys[0] ?? "";
    const link = linkPageToArticle(pageUrl, articles);
    const indexedStatus: GscIndexedStatus =
      row.impressions > 0 ? "indexed" : "unknown";

    return {
      page_url: pageUrl,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 10000) / 100,
      position: Math.round(row.position * 10) / 10,
      indexed_status: indexedStatus,
      generated_article_id: link.id ?? null,
      generated_article_slug: link.slug ?? null,
      district: link.district ?? null,
      category: link.tags?.[0] ?? null,
      period_start: startDate,
      period_end: endDate,
    };
  });
}
