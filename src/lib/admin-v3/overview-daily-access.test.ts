import { describe, expect, it } from "vitest";
import {
  resolveDailySectionAccess,
  DAILY_SECTIONS,
} from "@/lib/admin-v3/overview-daily-access";
import { assembleDailyPayload } from "@/lib/admin-v3/overview-daily";

describe("resolveDailySectionAccess", () => {
  it("super admin receives every section", () => {
    const access = resolveDailySectionAccess("super_admin");
    expect(access.canAccessEndpoint).toBe(true);
    expect(access.granted).toEqual([...DAILY_SECTIONS]);
    expect(access.withheld).toEqual([]);
  });

  it("editor gets editorial/seo/audience but not costs or platform", () => {
    const access = resolveDailySectionAccess("editor");
    expect(access.canAccessEndpoint).toBe(true);
    expect(access.bySection.editorial).toBe(true);
    expect(access.bySection.seo).toBe(true);
    expect(access.bySection.audience).toBe(true);
    expect(access.bySection.costs).toBe(false);
    expect(access.bySection.platform).toBe(false);
    expect(access.bySection.incidents).toBe(false);
  });

  it("moderator (editor-in-chief / technical) gets platform but not costs", () => {
    const access = resolveDailySectionAccess("moderator");
    expect(access.bySection.platform).toBe(true);
    expect(access.bySection.incidents).toBe(true);
    expect(access.bySection.costs).toBe(false);
    expect(access.bySection.seo).toBe(true);
  });

  it("journalist (viewer/reporter) gets platform but not costs", () => {
    const access = resolveDailySectionAccess("journalist");
    expect(access.bySection.platform).toBe(true);
    expect(access.bySection.costs).toBe(false);
  });

  it("viewer alias maps like journalist for costs", () => {
    const access = resolveDailySectionAccess("viewer");
    expect(access.bySection.costs).toBe(false);
    expect(access.canAccessEndpoint).toBe(true);
  });
});

describe("assembleDailyPayload permission omission", () => {
  const emptyTimed = (source: string) => ({
    source,
    ok: false as const,
    ms: 0,
    error: "forbidden",
  });

  it("omits costs and platform keys for editor (no null placeholders)", () => {
    const access = resolveDailySectionAccess("editor");
    const payload = assembleDailyPayload({
      access,
      generatedAt: "2026-07-19T00:00:00.000Z",
      wallStart: Date.now(),
      period: "today",
      editorialR: {
        source: "editorial",
        ok: true,
        ms: 10,
        data: {
          publishedToday: 2,
          publishedYesterday: 1,
          awaitingReview: 3,
          failedStories: 0,
          queuePending: 1,
          latestPublished: null,
        },
      },
      healthR: emptyTimed("platform"),
      execR: emptyTimed("costs"),
      gscR: emptyTimed("seo"),
      analyticsR: emptyTimed("audience"),
    });

    expect(payload.editorial).toBeDefined();
    expect(payload.costs).toBeUndefined();
    expect(payload.platform).toBeUndefined();
    expect(payload.incidents).toBeUndefined();
    expect((payload.permissions as { withheld: string[] }).withheld).toContain(
      "costs"
    );
    expect((payload.today as Record<string, unknown>).aiSpend).toBeUndefined();
  });

  it("includes costs for super_admin when source ok", () => {
    const access = resolveDailySectionAccess("super_admin");
    const payload = assembleDailyPayload({
      access,
      generatedAt: "2026-07-19T00:00:00.000Z",
      wallStart: Date.now(),
      period: "today",
      editorialR: emptyTimed("editorial"),
      healthR: emptyTimed("platform"),
      execR: {
        source: "costs",
        ok: true,
        ms: 5,
        data: {
          overview: {
            todaySpend: { display: "₹100", inr: 100 },
          },
        },
      },
      gscR: emptyTimed("seo"),
      analyticsR: emptyTimed("audience"),
    });

    expect(payload.costs).toBeDefined();
    expect((payload.today as Record<string, unknown>).aiSpend).toBe("₹100");
  });
});
