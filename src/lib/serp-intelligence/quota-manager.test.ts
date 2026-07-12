import { describe, expect, it } from "vitest";
import {
  computeQuotaStatus,
  computeReservedSearches,
  computeUsableMonthlyLimit,
  dayKeyFromDate,
  emptyQuotaUsage,
  estimatedResetAt,
  periodMonthFromDate,
} from "@/lib/serp-intelligence/quota-manager";

describe("quota-manager", () => {
  const config = {
    monthlyLimit: 250,
    reservedPercent: 10,
    dailyMax: 8,
  };

  it("computes reserved and usable monthly limits", () => {
    expect(computeReservedSearches(250, 10)).toBe(25);
    expect(computeUsableMonthlyLimit(250, 10)).toBe(225);
  });

  it("formats period and day keys in UTC", () => {
    const date = new Date("2026-07-11T12:00:00.000Z");
    expect(periodMonthFromDate(date)).toBe("2026-07");
    expect(dayKeyFromDate(date)).toBe("2026-07-11");
    expect(estimatedResetAt(date)).toBe("2026-08-01T00:00:00.000Z");
  });

  it("allows searches when monthly and daily budget remain", () => {
    const now = new Date("2026-07-11T12:00:00.000Z");
    const status = computeQuotaStatus(
      config,
      {
        searches_used: 100,
        searches_skipped: 0,
        daily_usage: { "2026-07-11": 3 },
      },
      now
    );

    expect(status.canSearch).toBe(true);
    expect(status.mode).toBe("hybrid");
    expect(status.searchesRemaining).toBe(125);
    expect(status.dailyRemaining).toBe(5);
    expect(status.keywordsCheckedToday).toBe(3);
  });

  it("enters gsc_only mode when monthly quota is exhausted", () => {
    const now = new Date("2026-07-11T12:00:00.000Z");
    const status = computeQuotaStatus(
      config,
      {
        searches_used: 225,
        searches_skipped: 12,
        daily_usage: { "2026-07-11": 2 },
      },
      now
    );

    expect(status.canSearch).toBe(false);
    expect(status.quotaExhausted).toBe(true);
    expect(status.mode).toBe("gsc_only");
    expect(status.searchesRemaining).toBe(0);
  });

  it("enters gsc_only mode when daily quota is exhausted", () => {
    const now = new Date("2026-07-11T12:00:00.000Z");
    const status = computeQuotaStatus(
      config,
      {
        searches_used: 50,
        searches_skipped: 0,
        daily_usage: { "2026-07-11": 8 },
      },
      now
    );

    expect(status.canSearch).toBe(false);
    expect(status.quotaExhausted).toBe(true);
    expect(status.mode).toBe("gsc_only");
    expect(status.dailyRemaining).toBe(0);
  });

  it("starts from empty usage", () => {
    const now = new Date("2026-07-11T12:00:00.000Z");
    const status = computeQuotaStatus(config, emptyQuotaUsage(), now);
    expect(status.searchesUsed).toBe(0);
    expect(status.searchesRemaining).toBe(225);
    expect(status.keywordsCheckedToday).toBe(0);
  });
});
