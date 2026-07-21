import { describe, expect, it } from "vitest";
import {
  availableRangesFromPoints,
  computeMovement,
  computeRangeStatistics,
  dedupeOnePointPerDay,
  filterPointsForRange,
  arePointsCompatible,
} from "@/lib/verified-rates/movement";
import type { VerifiedHistoryPoint } from "@/lib/verified-rates/types";

function pts(
  rows: Array<[string, string]>
): VerifiedHistoryPoint[] {
  return rows.map(([date, price]) => ({
    date,
    price,
    verifiedAt: `${date}T12:00:00+05:30`,
    sourceCount: 1,
  }));
}

describe("verified-rates movement", () => {
  it("insufficient history for one point", () => {
    const m = computeMovement(pts([["2026-07-20", "102.40"]]), 2);
    expect(m.status).toBe("insufficient_history");
    expect(m.absolute).toBeNull();
  });

  it("detects up / down / unchanged", () => {
    expect(computeMovement(pts([["2026-07-19", "100.00"], ["2026-07-20", "100.20"]]), 2).status).toBe(
      "up"
    );
    expect(computeMovement(pts([["2026-07-19", "100.20"], ["2026-07-20", "100.00"]]), 2).status).toBe(
      "down"
    );
    expect(computeMovement(pts([["2026-07-19", "100.00"], ["2026-07-20", "100.00"]]), 2).status).toBe(
      "unchanged"
    );
  });

  it("high/low and missing days with gaps", () => {
    const points = pts([
      ["2026-07-01", "100.00"],
      ["2026-07-03", "102.00"],
      ["2026-07-04", "101.00"],
    ]);
    const stats = computeRangeStatistics(points, 2);
    expect(stats.high).toBe("102.00");
    expect(stats.low).toBe("100.00");
    expect(stats.observationCount).toBe(3);
    expect(stats.missingDayCount).toBe(1);
  });

  it("dedupes same day keeping latest verification", () => {
    const deduped = dedupeOnePointPerDay([
      {
        date: "2026-07-20",
        price: "100.00",
        verifiedAt: "2026-07-20T06:00:00+05:30",
        sourceCount: 1,
      },
      {
        date: "2026-07-20",
        price: "100.50",
        verifiedAt: "2026-07-20T18:00:00+05:30",
        sourceCount: 2,
      },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.price).toBe("100.50");
  });

  it("range availability respects real span", () => {
    const seven = pts([
      ["2026-07-14", "100"],
      ["2026-07-20", "101"],
    ]);
    expect(availableRangesFromPoints(seven)).toEqual(["7D", "MAX"]);
    expect(availableRangesFromPoints(pts([["2026-07-20", "100"]]))).toEqual(["MAX"]);
  });

  it("filterPointsForRange does not invent days", () => {
    const points = pts([
      ["2026-07-01", "100"],
      ["2026-07-10", "101"],
      ["2026-07-20", "102"],
    ]);
    const filtered = filterPointsForRange(points, "7D", "2026-07-20");
    expect(filtered.map((p) => p.date)).toEqual(["2026-07-20"]);
  });

  it("rejects incompatible purity/unit/tax", () => {
    expect(
      arePointsCompatible(
        { unit: "10g", purity: "999", taxBasis: "ex_gst_benchmark" },
        { unit: "10g", purity: "916", taxBasis: "ex_gst_benchmark" }
      )
    ).toBe(false);
  });
});
