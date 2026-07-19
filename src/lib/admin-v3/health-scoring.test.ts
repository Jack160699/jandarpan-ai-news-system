import { describe, expect, it } from "vitest";
import {
  computeCanonicalScore,
  gradeForScore,
  SUBSYSTEM_WEIGHTS,
} from "./health-scoring";

describe("health-scoring weights", () => {
  it("subsystem weights sum to 1.0", () => {
    const total = Object.values(SUBSYSTEM_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(total - 1)).toBeLessThan(1e-9);
  });
});

describe("computeCanonicalScore", () => {
  it("all healthy → 100 / A", () => {
    const r = computeCanonicalScore({});
    expect(r.score).toBe(100);
    expect(r.grade).toBe("A");
  });

  it("optional external provider failure has limited impact", () => {
    const r = computeCanonicalScore({ external: "critical" });
    // external weight is small (0.06) → score stays high.
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(["A", "B"]).toContain(r.grade);
  });

  it("degraded ingestion incident lands near ~80s, not 28", () => {
    const r = computeCanonicalScore({
      ingestion: "degraded",
      external: "warning",
      publishing: "degraded",
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.score).toBeGreaterThan(28);
  });

  it("core publishing outage weighs heavily", () => {
    const optional = computeCanonicalScore({ external: "critical" });
    const core = computeCanonicalScore({ publishing: "critical" });
    expect(core.score).toBeLessThan(optional.score);
  });

  it("full ingestion outage (critical) is reflected but not zero", () => {
    const r = computeCanonicalScore({ ingestion: "critical" });
    // ingestion weight 0.12 → 100 - 0.12*85 = ~89.8
    expect(r.score).toBeGreaterThan(80);
    expect(r.score).toBeLessThan(100);
  });

  it("database persistence failure (critical) drops score materially", () => {
    const r = computeCanonicalScore({ database: "critical" });
    expect(r.score).toBeLessThan(90);
  });

  it("is deterministic", () => {
    const a = computeCanonicalScore({ ingestion: "degraded", ai: "warning" });
    const b = computeCanonicalScore({ ingestion: "degraded", ai: "warning" });
    expect(a.score).toBe(b.score);
  });

  it("grades map to thresholds", () => {
    expect(gradeForScore(95)).toBe("A");
    expect(gradeForScore(82)).toBe("B");
    expect(gradeForScore(72)).toBe("C");
    expect(gradeForScore(60)).toBe("D");
    expect(gradeForScore(20)).toBe("F");
  });
});
