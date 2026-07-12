import { describe, expect, it } from "vitest";
import { detectCtrOpportunities } from "@/lib/gsc-intelligence/ctr-opportunities";
import { detectPositionOpportunities } from "@/lib/gsc-intelligence/position-opportunities";
import { buildExecutiveReport } from "@/lib/gsc-intelligence/executive-report";
import { aggregateSiteTotals } from "@/lib/gsc-intelligence/site-performance";
import { buildTrendPeriod } from "@/lib/gsc-intelligence/trend-analysis";
import type { GscPageRecord, GscQueryRecord } from "@/lib/gsc-intelligence/types";

const sampleQuery: GscQueryRecord = {
  query: "raipur news",
  clicks: 50,
  impressions: 1200,
  ctr: 1.2,
  position: 6,
  previous_position: 9,
  position_delta: 3,
  trend: "rising",
  district: "raipur",
  category: "news",
};

describe("ctr-opportunities", () => {
  it("detects low CTR high impression queries", () => {
    const recs = detectCtrOpportunities([sampleQuery], []);
    expect(recs.some((r) => r.recommendation_type === "ctr_opportunity")).toBe(
      true
    );
  });
});

describe("position-opportunities", () => {
  it("detects striking distance keywords", () => {
    const recs = detectPositionOpportunities([sampleQuery]);
    expect(
      recs.some((r) => r.recommendation_type === "position_opportunity")
    ).toBe(true);
  });
});

describe("trend-analysis", () => {
  it("builds trend period with deltas", () => {
    const metrics = Array.from({ length: 14 }, (_, i) => ({
      metric_date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      clicks: i < 7 ? 10 : 20,
      impressions: 100,
      ctr: 5,
      position: 8,
    }));
    const period = buildTrendPeriod(metrics, 7, "7 days");
    expect(period.clicks).toBe(140);
    expect(period.clicks_delta).toBeGreaterThan(0);
  });
});

describe("site-performance", () => {
  it("aggregates site totals", () => {
    const totals = aggregateSiteTotals(
      [
        { metric_date: "2026-07-01", clicks: 10, impressions: 100, ctr: 10, position: 5 },
        { metric_date: "2026-07-02", clicks: 20, impressions: 200, ctr: 10, position: 7 },
      ],
      2
    );
    expect(totals.clicks).toBe(30);
    expect(totals.impressions).toBe(300);
  });
});

describe("executive-report", () => {
  it("builds winners and losers", () => {
    const report = buildExecutiveReport(
      [sampleQuery, { ...sampleQuery, query: "durg news", position_delta: -2, trend: "declining" }],
      [] as GscPageRecord[]
    );
    expect(report.topWinners.length).toBeGreaterThan(0);
    expect(report.topLosers.length).toBeGreaterThan(0);
  });
});
