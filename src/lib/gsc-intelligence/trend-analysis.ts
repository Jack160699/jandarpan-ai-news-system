/**
 * Module 7 — Trend Analysis
 */

import type {
  GscDailyMetricRecord,
  GscQueryRecord,
  GscTrend,
  GscTrendPeriod,
} from "@/lib/gsc-intelligence/types";
import { aggregateSiteTotals } from "@/lib/gsc-intelligence/site-performance";

export function buildTrendPeriod(
  metrics: GscDailyMetricRecord[],
  days: number,
  label: string
): GscTrendPeriod {
  const current = aggregateSiteTotals(metrics, days);
  const previousSlice = metrics.slice(-days * 2, -days);
  const previous = aggregateSiteTotals(previousSlice, previousSlice.length || days);

  return {
    days,
    label,
    clicks: current.clicks,
    impressions: current.impressions,
    ctr: current.ctr,
    position: current.position,
    clicks_delta: current.clicks - previous.clicks,
    impressions_delta: current.impressions - previous.impressions,
  };
}

export function buildDistrictTrends(
  queries: GscQueryRecord[]
): Array<{ district: string; clicks: number; trend: GscTrend }> {
  const byDistrict = new Map<string, { clicks: number; rising: number; declining: number }>();

  for (const q of queries) {
    if (!q.district) continue;
    const entry = byDistrict.get(q.district) ?? {
      clicks: 0,
      rising: 0,
      declining: 0,
    };
    entry.clicks += q.clicks;
    if (q.trend === "rising") entry.rising += 1;
    if (q.trend === "declining") entry.declining += 1;
    byDistrict.set(q.district, entry);
  }

  return [...byDistrict.entries()]
    .map(([district, data]) => ({
      district,
      clicks: data.clicks,
      trend:
        data.rising > data.declining
          ? ("rising" as GscTrend)
          : data.declining > data.rising
            ? ("declining" as GscTrend)
            : ("stable" as GscTrend),
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 12);
}

export function buildCategoryTrends(
  queries: GscQueryRecord[]
): Array<{ category: string; clicks: number; trend: GscTrend }> {
  const byCategory = new Map<string, { clicks: number; rising: number; declining: number }>();

  for (const q of queries) {
    if (!q.category) continue;
    const entry = byCategory.get(q.category) ?? {
      clicks: 0,
      rising: 0,
      declining: 0,
    };
    entry.clicks += q.clicks;
    if (q.trend === "rising") entry.rising += 1;
    if (q.trend === "declining") entry.declining += 1;
    byCategory.set(q.category, entry);
  }

  return [...byCategory.entries()]
    .map(([category, data]) => ({
      category,
      clicks: data.clicks,
      trend:
        data.rising > data.declining
          ? ("rising" as GscTrend)
          : data.declining > data.rising
            ? ("declining" as GscTrend)
            : ("stable" as GscTrend),
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 12);
}
