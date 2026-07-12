/**
 * Module 4 — Index Coverage
 */

import { listSitemaps } from "@/lib/gsc-intelligence/client";
import { fetchGoogleNewsArticlePool } from "@/lib/newsroom/generated/read";
import type { GscHealthStatus, GscIndexHealthRecord } from "@/lib/gsc-intelligence/types";

function sitemapHealthFromCounts(
  errors: number,
  warnings: number
): GscHealthStatus {
  if (errors > 0) return "error";
  if (warnings > 0) return "warning";
  return "healthy";
}

export async function collectIndexHealth(
  indexedPageEstimate: number
): Promise<GscIndexHealthRecord> {
  let errors = 0;
  let warnings = 0;
  let sitemapHealth: GscHealthStatus = "unknown";
  let newsSitemapHealth: GscHealthStatus = "unknown";
  const rawSitemaps: unknown[] = [];

  try {
    const sitemaps = await listSitemaps();
    rawSitemaps.push(...sitemaps);

    for (const sm of sitemaps) {
      errors += sm.errors ?? 0;
      warnings += sm.warnings ?? 0;
      if (sm.path?.includes("news-sitemap")) {
        newsSitemapHealth = sitemapHealthFromCounts(
          sm.errors ?? 0,
          sm.warnings ?? 0
        );
      }
    }

    sitemapHealth = sitemapHealthFromCounts(errors, warnings);
  } catch {
    sitemapHealth = "unknown";
  }

  let newsPoolCount = 0;
  try {
    const pool = await fetchGoogleNewsArticlePool();
    newsPoolCount = pool.length;
    if (newsSitemapHealth === "unknown") {
      newsSitemapHealth = newsPoolCount > 0 ? "healthy" : "warning";
    }
  } catch {
    if (newsSitemapHealth === "unknown") newsSitemapHealth = "warning";
  }

  return {
    indexed_pages: indexedPageEstimate,
    excluded_pages: 0,
    errors,
    warnings,
    sitemap_health: sitemapHealth,
    news_sitemap_health: newsSitemapHealth,
    canonical_issues: 0,
    robots_issues: 0,
    raw_metadata: {
      sitemaps: rawSitemaps,
      news_sitemap_entries: newsPoolCount,
    },
  };
}
