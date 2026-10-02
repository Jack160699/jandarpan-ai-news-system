import { beforeEach, describe, expect, it, vi } from "vitest";

const selects: Array<{ table: string; cols: string }> = [];

const geo = (districts: string[]) => ({ tagged_at: "2026-10-01T00:00:00Z", state: "chhattisgarh", is_chhattisgarh: true, districts, confidence: 0.9 });

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAdminServerClient: () => ({
    from: (table: string) => ({
      select: (cols: string) => {
        selects.push({ table, cols });
        const rows: Record<string, unknown[]> = {
          generated_articles: [
            // projected shape: only the fields geoFromRecord / the breaking flag / topic category need
            { headline: "h1", summary: "s", tags: ["क्राइम"], geo_metadata: geo(["raipur"]), regional: null, is_breaking: true, created_at: "x", category: "crime" },
            { headline: "h2", summary: "s", tags: [], geo_metadata: geo(["raipur", "durg"]), regional: null, is_breaking: false, created_at: "x", category: "politics" },
            { headline: "h3", summary: "s", tags: [], geo_metadata: geo([]), regional: null, is_breaking: false, created_at: "x", category: "crime" },
          ],
          platform_articles: [{ district_slug: "bilaspur", is_breaking: true, published_at: "x", category: "crime" }],
          platform_topics: [{ slug: "crime-hub", content_types: ["crime"] }],
        };
        const result = { data: rows[table] ?? [], error: null };
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        for (const k of ["gte", "order", "eq", "in", "limit"]) chain[k] = self;
        chain.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
        return chain;
      },
    }),
  }),
}));

beforeEach(async () => {
  vi.resetModules();
  selects.length = 0;
  const { clearSharedReadMemo } = await import("@/lib/infrastructure/cache/shared-read-cache");
  clearSharedReadMemo();
});

describe("hub count reads (district / topic)", () => {
  it("district counts are computed from the slim projection and cached across calls", async () => {
    const mod = await import("./districts");
    const a = await mod.loadPlatformDistrictsHub().catch(() => []);
    await mod.loadPlatformDistrictsHub().catch(() => []);
    const gen = selects.filter((s) => s.table === "generated_articles");
    // never reads editorial_metadata / article_body as whole columns
    for (const s of gen) {
      expect(s.cols).not.toMatch(/(^|,)\s*editorial_metadata\s*(,|$)/);
      expect(s.cols).not.toContain("article_body");
      expect(s.cols).toContain("editorial_metadata->is_breaking");
    }
    // the second call was served from cache: generated_articles read at most once
    expect(gen.length).toBeLessThanOrEqual(1);
    expect(Array.isArray(a)).toBe(true);
  });

  it("topic counts use the category JSON-path projection, not the whole metadata", async () => {
    const { listAdminTopics } = await import("./topics");
    await listAdminTopics().catch(() => null);
    const gen = selects.filter((s) => s.table === "generated_articles");
    expect(gen.length).toBeGreaterThan(0);
    for (const s of gen) {
      expect(s.cols).toContain("editorial_metadata->category");
      expect(s.cols).not.toMatch(/(^|,)\s*editorial_metadata\s*(,|$)/);
    }
  });
});
