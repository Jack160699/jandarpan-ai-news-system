import { describe, expect, it } from "vitest";
import { buildHistoryResponse } from "@/lib/verified-rates/history";
import type { DailySnapshotRecord } from "@/lib/verified-rates/types";

function snap(
  partial: Partial<DailySnapshotRecord> & {
    effectiveDate: string;
    priceNumeric: string;
  }
): DailySnapshotRecord {
  return {
    id: partial.id ?? `id-${partial.effectiveDate}`,
    category: partial.category ?? "petrol",
    geoScope: partial.geoScope ?? "city",
    citySlug: partial.citySlug ?? "raipur",
    stateCode: "CG",
    countryCode: "IN",
    purity: null,
    unit: "litre",
    taxBasis: "retail_rsp_indicative",
    priceNumeric: partial.priceNumeric,
    currency: "INR",
    sourceCount: partial.sourceCount ?? 1,
    participatingFamilies: 1,
    consensusMethod: "single_eligible_source",
    spread: null,
    confidence: "0.7",
    sourceReportedAt: partial.sourceReportedAt ?? `${partial.effectiveDate}T06:00:00+05:30`,
    generatedAt: partial.generatedAt ?? `${partial.effectiveDate}T06:05:00+05:30`,
    effectiveDate: partial.effectiveDate,
    validUntil: null,
    status: "accepted",
    anomalyStatus: "none",
    sessionLabel: "day",
    acceptedRunId: null,
    recordKey: partial.recordKey ?? `k-${partial.effectiveDate}`,
  };
}

describe("buildHistoryResponse", () => {
  it("rejects unsupported city", () => {
    const r = buildHistoryResponse({
      category: "petrol",
      citySlug: "mumbai",
      range: "30D",
      snapshots: [],
    });
    expect(r).toEqual({ error: "unsupported_combination" });
  });

  it("zero points → unavailable, no graph", () => {
    const r = buildHistoryResponse({
      category: "petrol",
      citySlug: "raipur",
      range: "MAX",
      snapshots: [],
      currentStatus: "blocked",
    });
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.status).toBe("blocked");
    expect(r.points).toEqual([]);
    expect(r.graphEligible).toBe(false);
    expect(r.movement.status).toBe("insufficient_history");
    expect(JSON.stringify(r)).not.toMatch(/undefined|NaN/);
  });

  it("one point → no graph, honest message fields", () => {
    const r = buildHistoryResponse({
      category: "petrol",
      citySlug: "raipur",
      range: "MAX",
      snapshots: [snap({ effectiveDate: "2026-07-20", priceNumeric: "102.40" })],
    });
    if ("error" in r) throw new Error("unexpected");
    expect(r.points).toHaveLength(1);
    expect(r.graphEligible).toBe(false);
    expect(r.current.price).toBe("102.40");
  });

  it("two points chronological with movement", () => {
    const r = buildHistoryResponse({
      category: "diesel",
      citySlug: "durg",
      range: "MAX",
      snapshots: [
        snap({
          category: "diesel",
          citySlug: "durg",
          effectiveDate: "2026-07-19",
          priceNumeric: "90.00",
        }),
        snap({
          category: "diesel",
          citySlug: "durg",
          effectiveDate: "2026-07-20",
          priceNumeric: "90.50",
        }),
      ],
    });
    if ("error" in r) throw new Error("unexpected");
    expect(r.graphEligible).toBe(true);
    expect(r.movement.status).toBe("up");
    expect(r.points[0]!.date <= r.points[1]!.date).toBe(true);
  });

  it("bullion state pages never require city", () => {
    const r = buildHistoryResponse({
      category: "gold_24k",
      citySlug: null,
      range: "MAX",
      snapshots: [],
      currentStatus: "blocked",
    });
    if ("error" in r) throw new Error("unexpected");
    expect(r.location.geoScope).toBe("state");
    expect(r.location.city).toBeNull();
  });

  it("never emits zero fallback price", () => {
    const r = buildHistoryResponse({
      category: "petrol",
      citySlug: "bhilai",
      range: "MAX",
      snapshots: [
        snap({
          citySlug: "bhilai",
          effectiveDate: "2026-07-20",
          priceNumeric: "0",
        }),
      ],
    });
    if ("error" in r) throw new Error("unexpected");
    expect(r.points).toHaveLength(0);
    expect(r.current.price).toBeNull();
  });
});
