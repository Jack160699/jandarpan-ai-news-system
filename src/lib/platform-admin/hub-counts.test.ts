import { beforeEach, describe, expect, it, vi } from "vitest";

const selects: Array<{ table: string; cols: string; filters: string[] }> = [];

const geo = (districts: string[]) => ({ tagged_at: "2026-10-01T00:00:00Z", state: "chhattisgarh", is_chhattisgarh: true, districts, confidence: 0.9 });

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAdminServerClient: () => ({
    from: (table: string) => ({
      select: (cols: string) => {
        const entry = { table, cols, filters: [] as string[] };
        selects.push(entry);
        const rowsFor = (): unknown[] => {
          if (table === "generated_articles") {
            if (cols.startsWith("districts:")) {
              // tagged rows, lean projection
              return [
                { districts: ["raipur"], is_cg: true, is_breaking: true },
                { districts: ["raipur", "durg"], is_cg: true, is_breaking: false },
                { districts: [], is_cg: true, is_breaking: false },
                { districts: [], is_cg: false, is_breaking: false },
              ];
            }
            if (cols.includes("headline")) {
              // the rare untagged row: text-classified by geoFromRecord (no stored tag)
              return [{ headline: "रायपुर में सड़क हादसा, छत्तीसगढ़ पुलिस ने मामला दर्ज किया", summary: "रायपुर जिले में", tags: [], geo_metadata: null, regional: null, is_breaking: false, created_at: "x", category: "crime" }];
            }
            return [{ tags: ["क्राइम"], category: "crime" }];
          }
          if (table === "platform_districts") {
            return ["raipur", "durg", "statewide", "bilaspur"].map((slug, i) => ({ slug, name_en: slug, name_hi: slug, priority_tier: i + 1, enabled: true, sections: [], homepage_config: {}, editor_user_ids: [], trend_score: 0, metadata: {}, created_at: "x", updated_at: "x" }));
          }
          if (table === "platform_articles") return [{ district_slug: "bilaspur", is_breaking: true, published_at: "x", category: "crime" }];
          if (table === "platform_topics") return [{ slug: "crime-hub", content_types: ["crime"] }];
          return [];
        };
        const chain: Record<string, unknown> = {};
        const self = (name: string) => (...a: unknown[]) => { entry.filters.push(`${name}:${a.map(String).join(",")}`); return chain; };
        for (const k of ["gte", "order", "eq", "in", "limit", "not", "or"]) chain[k] = self(k);
        chain.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve({ data: rowsFor(), error: null }).then(res, rej);
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
  it("district counts come from the lean tagged projection (+ text fallback only for untagged rows) and are correct", async () => {
    const { listAdminDistricts } = await import("./districts");
    const rows = (await listAdminDistricts())!;
    const by = Object.fromEntries(rows.map((r) => [r.slug, r]));
    expect(by.raipur!.articleCount).toBe(2 + 1); // 2 tagged + 1 untagged classified as Raipur by text
    expect(by.raipur!.liveCount).toBe(1);
    expect(by.durg!.articleCount).toBe(1);
    expect(by.statewide!.articleCount).toBe(1); // tagged CG article with no district
    expect(by.bilaspur!.articleCount).toBe(1); // platform_articles
    expect(by.bilaspur!.liveCount).toBe(1);
  });

  it("never reads whole editorial_metadata / article_body, and the wide read is limited to untagged rows", async () => {
    const { listAdminDistricts } = await import("./districts");
    await listAdminDistricts();
    const gen = selects.filter((s) => s.table === "generated_articles");
    expect(gen).toHaveLength(2);
    for (const s of gen) {
      expect(s.cols).not.toMatch(/(^|,)\s*editorial_metadata\s*(,|$)/);
      expect(s.cols).not.toContain("article_body");
    }
    const lean = gen.find((s) => s.cols.startsWith("districts:"))!;
    expect(lean.filters.some((f) => f.startsWith("not:geo_metadata->>tagged_at"))).toBe(true);
    const wide = gen.find((s) => s.cols.includes("headline"))!;
    expect(wide.filters.some((f) => f.startsWith("or:") && f.includes("tagged_at.is.null"))).toBe(true);
    expect(wide.filters.some((f) => f === "limit:200")).toBe(true);
  });

  it("is cached: a second call within the TTL does not read generated_articles again", async () => {
    const mod = await import("./districts");
    await mod.loadPlatformDistrictsHub();
    const first = selects.filter((s) => s.table === "generated_articles").length;
    await mod.loadPlatformDistrictsHub();
    expect(selects.filter((s) => s.table === "generated_articles").length).toBe(first);
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
