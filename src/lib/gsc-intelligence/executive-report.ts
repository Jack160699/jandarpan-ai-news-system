/**
 * Module 8 — Executive Report
 */

import type {
  GscExecutiveReport,
  GscPageRecord,
  GscQueryRecord,
} from "@/lib/gsc-intelligence/types";

export function buildExecutiveReport(
  queries: GscQueryRecord[],
  pages: GscPageRecord[]
): GscExecutiveReport {
  const withDelta = queries.filter(
    (q) => q.position_delta !== null && q.position_delta !== undefined
  );

  const topWinners = [...withDelta]
    .filter((q) => (q.position_delta ?? 0) > 0)
    .sort((a, b) => (b.position_delta ?? 0) - (a.position_delta ?? 0))
    .slice(0, 10)
    .map((q) => ({
      query: q.query,
      clicks_delta: q.clicks,
      position_delta: q.position_delta ?? 0,
    }));

  const topLosers = [...withDelta]
    .filter((q) => (q.position_delta ?? 0) < 0)
    .sort((a, b) => (a.position_delta ?? 0) - (b.position_delta ?? 0))
    .slice(0, 10)
    .map((q) => ({
      query: q.query,
      clicks_delta: q.clicks,
      position_delta: q.position_delta ?? 0,
    }));

  const fastestGrowing = [...queries]
    .filter((q) => q.trend === "rising")
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((q) => ({
      query: q.query,
      impressions_delta: q.impressions,
    }));

  const fastestDeclining = [...queries]
    .filter((q) => q.trend === "declining")
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((q) => ({
      query: q.query,
      impressions_delta: -q.impressions,
    }));

  const mostClickedArticles = [...pages]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)
    .map((p) => ({
      page_url: p.page_url,
      clicks: p.clicks,
      slug: p.generated_article_slug ?? undefined,
    }));

  const withClicks = queries.filter((q) => q.clicks >= 5);

  const highestCtr = [...withClicks]
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, 10)
    .map((q) => ({
      query: q.query,
      ctr: q.ctr,
      clicks: q.clicks,
    }));

  const lowestCtr = [...queries]
    .filter((q) => q.impressions >= 100)
    .sort((a, b) => a.ctr - b.ctr)
    .slice(0, 10)
    .map((q) => ({
      query: q.query,
      ctr: q.ctr,
      impressions: q.impressions,
    }));

  return {
    topWinners,
    topLosers,
    fastestGrowingKeywords: fastestGrowing,
    fastestDecliningKeywords: fastestDeclining,
    mostClickedArticles,
    highestCtr,
    lowestCtr,
  };
}
