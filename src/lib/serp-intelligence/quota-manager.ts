/**
 * Hybrid SERP — quota manager
 *
 * GSC remains primary intelligence; SerpAPI is budgeted for high-value verification only.
 */

import {
  SERP_DAILY_MAX,
  SERP_MONTHLY_LIMIT,
  SERP_RESERVED_PERCENT,
} from "@/lib/serp-intelligence/config";
import { logSerp } from "@/lib/serp-intelligence/logger";
import {
  getQuotaUsageRow,
  incrementQuotaUsage,
  insertQuotaLog,
} from "@/lib/serp-intelligence/repository";
import type { SerpQuotaStatus } from "@/lib/serp-intelligence/types";

export interface SerpQuotaConfig {
  monthlyLimit: number;
  reservedPercent: number;
  dailyMax: number;
}

export interface SerpQuotaUsageRow {
  searches_used: number;
  searches_skipped: number;
  daily_usage: Record<string, number>;
}

export function getSerpQuotaConfig(): SerpQuotaConfig {
  return {
    monthlyLimit: SERP_MONTHLY_LIMIT,
    reservedPercent: SERP_RESERVED_PERCENT,
    dailyMax: SERP_DAILY_MAX,
  };
}

export function periodMonthFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function dayKeyFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function estimatedResetAt(date: Date): string {
  const reset = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  );
  return reset.toISOString();
}

export function computeReservedSearches(
  monthlyLimit: number,
  reservedPercent: number
): number {
  return Math.floor((monthlyLimit * reservedPercent) / 100);
}

export function computeUsableMonthlyLimit(
  monthlyLimit: number,
  reservedPercent: number
): number {
  return Math.max(
    0,
    monthlyLimit - computeReservedSearches(monthlyLimit, reservedPercent)
  );
}

export function computeQuotaStatus(
  config: SerpQuotaConfig,
  usage: SerpQuotaUsageRow,
  now: Date
): SerpQuotaStatus {
  const periodMonth = periodMonthFromDate(now);
  const dayKey = dayKeyFromDate(now);
  const reservedSearches = computeReservedSearches(
    config.monthlyLimit,
    config.reservedPercent
  );
  const usableMonthlyLimit = computeUsableMonthlyLimit(
    config.monthlyLimit,
    config.reservedPercent
  );
  const searchesUsed = usage.searches_used;
  const searchesRemaining = Math.max(0, usableMonthlyLimit - searchesUsed);
  const dailyUsed = usage.daily_usage[dayKey] ?? 0;
  const dailyRemaining = Math.max(0, config.dailyMax - dailyUsed);
  const monthlyAvailable = searchesRemaining > 0;
  const dailyAvailable = dailyRemaining > 0;
  const canSearch = monthlyAvailable && dailyAvailable;
  const quotaExhausted = !canSearch;

  return {
    monthlyLimit: config.monthlyLimit,
    reservedSearches,
    usableMonthlyLimit,
    searchesUsed,
    searchesRemaining,
    searchesSkipped: usage.searches_skipped,
    keywordsCheckedToday: dailyUsed,
    dailyMax: config.dailyMax,
    dailyUsed,
    dailyRemaining,
    canSearch,
    quotaExhausted,
    mode: canSearch ? "hybrid" : "gsc_only",
    periodMonth,
    estimatedResetAt: estimatedResetAt(now),
  };
}

export function emptyQuotaUsage(): SerpQuotaUsageRow {
  return {
    searches_used: 0,
    searches_skipped: 0,
    daily_usage: {},
  };
}

export async function getSerpQuotaStatus(
  now = new Date()
): Promise<SerpQuotaStatus> {
  const config = getSerpQuotaConfig();
  const periodMonth = periodMonthFromDate(now);
  const usage = (await getQuotaUsageRow(periodMonth)) ?? emptyQuotaUsage();
  return computeQuotaStatus(config, usage, now);
}

export async function canPerformSerpSearch(now = new Date()): Promise<boolean> {
  const status = await getSerpQuotaStatus(now);
  return status.canSearch;
}

export async function recordSerpSearch(input: {
  keyword: string;
  keywordId: string;
  priorityScore?: number;
  now?: Date;
}): Promise<SerpQuotaStatus> {
  const now = input.now ?? new Date();
  const config = getSerpQuotaConfig();
  const periodMonth = periodMonthFromDate(now);
  const dayKey = dayKeyFromDate(now);

  const usage = await incrementQuotaUsage({
    periodMonth,
    dayKey,
    searchesUsedDelta: 1,
    searchesSkippedDelta: 0,
  });

  await insertQuotaLog({
    keyword: input.keyword,
    keywordId: input.keywordId,
    action: "search",
    priorityScore: input.priorityScore ?? null,
    reason: "serp_verification",
  });

  logSerp("serp_request", {
    keyword: input.keyword,
    keywordId: input.keywordId,
    priorityScore: input.priorityScore,
    periodMonth,
    dayKey,
  });

  return computeQuotaStatus(config, usage, now);
}

export async function recordSerpSkipped(input: {
  keyword: string;
  keywordId: string;
  reason: "monthly_quota_exhausted" | "daily_quota_exhausted";
  priorityScore?: number;
  now?: Date;
}): Promise<SerpQuotaStatus> {
  const now = input.now ?? new Date();
  const config = getSerpQuotaConfig();
  const periodMonth = periodMonthFromDate(now);
  const action =
    input.reason === "daily_quota_exhausted" ? "skipped_daily" : "skipped_quota";

  const usage = await incrementQuotaUsage({
    periodMonth,
    dayKey: dayKeyFromDate(now),
    searchesUsedDelta: 0,
    searchesSkippedDelta: 1,
  });

  await insertQuotaLog({
    keyword: input.keyword,
    keywordId: input.keywordId,
    action,
    priorityScore: input.priorityScore ?? null,
    reason: input.reason,
  });

  logSerp("serp_skipped_quota", {
    keyword: input.keyword,
    keywordId: input.keywordId,
    reason: input.reason,
    priorityScore: input.priorityScore,
    action,
  });

  return computeQuotaStatus(config, usage, now);
}

export function defaultQuotaStatus(now = new Date()): SerpQuotaStatus {
  return computeQuotaStatus(getSerpQuotaConfig(), emptyQuotaUsage(), now);
}
