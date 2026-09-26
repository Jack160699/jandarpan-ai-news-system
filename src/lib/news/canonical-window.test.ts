import { describe, it, expect } from "vitest";
import {
  READER_NEWS_WINDOW_DAYS,
  READER_NEWS_WINDOW_MS,
  getCanonicalReaderCutoff,
  getCanonicalReaderCutoffIso,
  isWithinCanonicalReaderWindow,
  computeArchiveHealthBreakdown,
} from "./canonical-window";

describe("canonical-window", () => {
  const fixedNow = new Date("2026-09-26T12:00:00.000Z");

  it("defines standard 30-day window", () => {
    expect(READER_NEWS_WINDOW_DAYS).toBe(30);
    expect(READER_NEWS_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("calculates exact 30-day cutoff date and ISO", () => {
    const cutoff = getCanonicalReaderCutoff(fixedNow);
    expect(cutoff.toISOString()).toBe("2026-08-27T12:00:00.000Z");
    expect(getCanonicalReaderCutoffIso(fixedNow)).toBe("2026-08-27T12:00:00.000Z");
  });

  it("verifies eligibility across age boundaries", () => {
    // 0 days ago (fresh now)
    expect(isWithinCanonicalReaderWindow(fixedNow, fixedNow)).toBe(true);

    // 1 day ago
    const day1 = new Date("2026-09-25T12:00:00.000Z");
    expect(isWithinCanonicalReaderWindow(day1, fixedNow)).toBe(true);

    // 7 days ago
    const day7 = new Date("2026-09-19T12:00:00.000Z");
    expect(isWithinCanonicalReaderWindow(day7, fixedNow)).toBe(true);

    // 14 days ago
    const day14 = new Date("2026-09-12T12:00:00.000Z");
    expect(isWithinCanonicalReaderWindow(day14, fixedNow)).toBe(true);

    // 21 days ago
    const day21 = new Date("2026-09-05T12:00:00.000Z");
    expect(isWithinCanonicalReaderWindow(day21, fixedNow)).toBe(true);

    // 29 days ago
    const day29 = new Date("2026-08-28T12:00:00.000Z");
    expect(isWithinCanonicalReaderWindow(day29, fixedNow)).toBe(true);

    // 30 days exact boundary
    const day30Exact = new Date("2026-08-27T12:00:00.000Z");
    expect(isWithinCanonicalReaderWindow(day30Exact, fixedNow)).toBe(true);

    // 31 days ago (outside window)
    const day31 = new Date("2026-08-26T12:00:00.000Z");
    expect(isWithinCanonicalReaderWindow(day31, fixedNow)).toBe(false);

    // Future within 2 hours grace
    const future1Hour = new Date("2026-09-26T13:00:00.000Z");
    expect(isWithinCanonicalReaderWindow(future1Hour, fixedNow)).toBe(true);

    // Future beyond 2 hours grace
    const future3Hours = new Date("2026-09-26T15:30:00.000Z");
    expect(isWithinCanonicalReaderWindow(future3Hours, fixedNow)).toBe(false);

    // Invalid inputs
    expect(isWithinCanonicalReaderWindow(null, fixedNow)).toBe(false);
    expect(isWithinCanonicalReaderWindow(undefined, fixedNow)).toBe(false);
    expect(isWithinCanonicalReaderWindow("", fixedNow)).toBe(false);
    expect(isWithinCanonicalReaderWindow("invalid-date", fixedNow)).toBe(false);
  });

  it("computes archive health breakdown accurately", () => {
    const testArticles = [
      { published_at: "2026-09-26T06:00:00.000Z" }, // 0-1 d
      { published_at: "2026-09-24T12:00:00.000Z" }, // 2-3 d
      { published_at: "2026-09-20T12:00:00.000Z" }, // 4-7 d
      { published_at: "2026-09-15T12:00:00.000Z" }, // 8-14 d
      { published_at: "2026-09-08T12:00:00.000Z" }, // 15-21 d
      { published_at: "2026-09-01T12:00:00.000Z" }, // 22-30 d
      { published_at: "2026-08-20T12:00:00.000Z" }, // >30 d
    ];

    const health = computeArchiveHealthBreakdown(testArticles, fixedNow);
    expect(health.total).toBe(7);
    expect(health.buckets["0_1_days"]).toBe(1);
    expect(health.buckets["2_3_days"]).toBe(1);
    expect(health.buckets["4_7_days"]).toBe(1);
    expect(health.buckets["8_14_days"]).toBe(1);
    expect(health.buckets["15_21_days"]).toBe(1);
    expect(health.buckets["22_30_days"]).toBe(1);
    expect(health.buckets["older_than_30_days"]).toBe(1);
    expect(health.oldestPublishedAt).toBe("2026-08-20T12:00:00.000Z");
  });
});
