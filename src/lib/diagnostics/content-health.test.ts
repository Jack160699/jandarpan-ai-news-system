import { beforeEach, describe, expect, it, vi } from "vitest";

let pool: Array<Record<string, unknown>> = [];
vi.mock("@/lib/newsroom/generated/read", () => ({ fetchGeneratedArticlePool: async () => pool }));

import { runContentAvailabilityHealthCheck } from "./content-health";

const iso = (ageHours: number) => new Date(Date.now() - ageHours * 3_600_000).toISOString();

describe("runContentAvailabilityHealthCheck", () => {
  beforeEach(() => {
    pool = [];
  });

  it("reports CRITICAL when the database has nothing eligible; frozen static articles are never counted as inventory", async () => {
    const report = await runContentAvailabilityHealthCheck();
    expect(report.status).toBe("critical");
    expect(report.taza.eligibleStoryCount).toBe(0);
    expect(report.taza.newestPublishedAt).toBeNull();
    expect(report.districts.durg).toBe(0);
  });

  it("counts only stories that pass the public gate (status, 30-day window, fit headline)", async () => {
    const hero = "https://images.jandarpan.news/real-photo.jpg";
    const make = (id: string, ageHours: number, extra: Record<string, unknown> = {}) => ({
      id,
      slug: `s-${id}`,
      headline: `रायपुर में ${id} सड़क हादसा, पांच घायल, प्रशासन ने जांच शुरू की`,
      summary: "सार",
      published_at: iso(ageHours),
      created_at: iso(ageHours),
      editorial_status: "approved",
      language: "hi",
      tags: [],
      hero_image_url: hero,
      editorial_metadata: {},
      geo_metadata: { scope: "STATEWIDE_CHHATTISGARH" },
      ...extra,
    });
    pool = [make("ok", 1), make("ancient", 24 * 45), make("pending", 1, { editorial_status: "pending" }), make("generic", 1, { headline: "Regional News Update" })];
    const report = await runContentAvailabilityHealthCheck();
    expect(report.totalVerifiedInventory).toBeLessThanOrEqual(1);
    expect(report.status).toBe("critical");
  });
});
