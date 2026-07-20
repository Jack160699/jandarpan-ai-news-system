import { describe, expect, it } from "vitest";
import {
  GNEWS_QUOTA_ALLOCATION_PCT,
  allocateRequestBudget,
  assertAllocationSumsTo100,
  buildDistrictGapQueries,
  planGnewsQuota,
} from "@/lib/autonomous/gnews-quota-planner";

describe("gnews-quota-planner", () => {
  it("allocation percentages sum to 100%", () => {
    expect(() => assertAllocationSumsTo100()).not.toThrow();
    const sum = Object.values(GNEWS_QUOTA_ALLOCATION_PCT).reduce(
      (a, b) => a + b,
      0
    );
    expect(sum).toBe(100);
  });

  it("reserve bucket is present and non-zero for typical limits", () => {
    const alloc = allocateRequestBudget(100);
    expect(alloc.gaps).toBe(40);
    expect(alloc.statewide).toBe(20);
    expect(alloc.second_pass).toBe(20);
    expect(alloc.topical).toBe(10);
    expect(alloc.reserve).toBe(10);
    expect(Object.values(alloc).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("builds English and Hindi gap queries for under-covered districts", () => {
    const queries = buildDistrictGapQueries(
      [
        {
          districtSlug: "raipur",
          tier: "high",
          target: 8,
          published: 1,
          deficit: 7,
          priorityScore: 100,
        },
        {
          districtSlug: "sukma",
          tier: "low",
          target: 2,
          published: 0,
          deficit: 2,
          priorityScore: 20,
        },
      ],
      10
    );
    expect(queries[0].districtSlug).toBe("raipur");
    expect(queries[0].bucket).toBe("gaps");
    expect(queries[0].query.toLowerCase()).toContain("raipur");
    const raipurQueries = queries.filter((q) => q.districtSlug === "raipur");
    expect(raipurQueries.length).toBeGreaterThanOrEqual(2);
    expect(raipurQueries.some((q) => /रायपुर/.test(q.query))).toBe(true);
    const unique = new Set(queries.map((q) => q.query));
    expect(unique.size).toBe(queries.length);
  });

  it("planGnewsQuota exposes remaining and queries", () => {
    const plan = planGnewsQuota({
      day: "2026-07-21",
      requestsLimit: 100,
      requestsUsed: 10,
      underCovered: [
        {
          districtSlug: "durg",
          tier: "high",
          target: 8,
          published: 0,
          deficit: 8,
          priorityScore: 80,
        },
      ],
    });
    expect(plan.remaining).toBe(90);
    expect(plan.queries.length).toBeGreaterThan(0);
  });
});
