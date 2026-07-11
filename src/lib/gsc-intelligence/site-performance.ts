/**
 * Module 1 — Site Performance
 */

import { daysAgo, formatGscDate, querySearchAnalytics } from "@/lib/gsc-intelligence/client";
import type { GscDailyMetricRecord } from "@/lib/gsc-intelligence/types";

export async function collectDailyMetrics(
  lookbackDays: number,
  now = new Date()
): Promise<GscDailyMetricRecord[]> {
  const endDate = formatGscDate(now);
  const startDate = daysAgo(lookbackDays, now);

  const rows = await querySearchAnalytics({
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: lookbackDays + 5,
  });

  return rows
    .map((row) => ({
      metric_date: row.keys[0] ?? "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 10000) / 100,
      position: Math.round(row.position * 10) / 10,
    }))
    .filter((r) => r.metric_date)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date));
}

export function aggregateSiteTotals(
  metrics: GscDailyMetricRecord[],
  days: number
): { clicks: number; impressions: number; ctr: number; position: number } {
  const slice = metrics.slice(-days);
  if (slice.length === 0) {
    return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  }

  const clicks = slice.reduce((s, m) => s + m.clicks, 0);
  const impressions = slice.reduce((s, m) => s + m.impressions, 0);
  const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
  const position =
    Math.round(
      (slice.reduce((s, m) => s + m.position, 0) / slice.length) * 10
    ) / 10;

  return { clicks, impressions, ctr, position };
}
