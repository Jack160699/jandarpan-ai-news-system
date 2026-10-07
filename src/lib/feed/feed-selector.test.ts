import { describe, expect, it } from "vitest";
import {
  classifyFreshness,
  comparePublishedDesc,
  freshnessHistogram,
} from "@/lib/feed/freshness";
import { selectFeedRows, type FeedRow } from "@/lib/feed/feed-selector";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function row(id: string, hoursAgo: number, scope: string, extra: Partial<FeedRow> = {}, geo: Record<string, unknown> = {}): FeedRow {
  return {
    id,
    headline: `headline ${id}`,
    published_at: ago(hoursAgo),
    geo_metadata: { scope, ...geo },
    ...extra,
  };
}

describe("freshness", () => {
  it.each([
    [0.2, "lt_1h"],
    [1, "h1_3"],
    [2.9, "h1_3"],
    [3, "h3_6"],
    [7, "h6_12"],
    [13, "h12_24"],
    [30, "d1_2"],
    [60, "older"],
  ])("classifies %sh as %s", (h, cls) => {
    expect(classifyFreshness(ago(h as number), NOW)).toBe(cls);
  });

  it("treats a future timestamp as just-now and a missing one as older", () => {
    expect(classifyFreshness(new Date(NOW.getTime() + 5 * 60_000).toISOString(), NOW)).toBe("lt_1h");
    expect(classifyFreshness(null, NOW)).toBe("older");
  });

  it("histograms rows", () => {
    const h = freshnessHistogram([{ published_at: ago(0.5) }, { published_at: ago(5) }, { published_at: ago(100) }], NOW);
    expect(h.lt_1h).toBe(1);
    expect(h.h3_6).toBe(1);
    expect(h.older).toBe(1);
  });

  it("comparePublishedDesc orders newest first", () => {
    const rows = [row("a", 5, "X"), row("b", 1, "X"), row("c", 3, "X")];
    expect([...rows].sort(comparePublishedDesc).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });
});

describe("selectFeedRows — district isolation", () => {
  const rows: FeedRow[] = [
    row("raipur-1", 2, "DISTRICT_SPECIFIC", {}, { primary_district: "raipur", districts: ["raipur"] }),
    row("durg-1", 1, "DISTRICT_SPECIFIC", {}, { primary_district: "durg", districts: ["durg"] }),
    row("state-1", 0.5, "STATEWIDE_CHHATTISGARH"),
    row("nat-1", 0.2, "NATIONAL"),
    row("intl-1", 0.1, "INTERNATIONAL"),
    row("unk-1", 0.3, "UNKNOWN"),
    row("relevant-1", 0.4, "INDIA_RELEVANT_TO_CHHATTISGARH"),
  ];

  it("/district/raipur shows only Raipur-evidenced stories — never statewide, national, international or unknown", () => {
    const { rows: out, diagnostics } = selectFeedRows(rows, { feed: "district", districtSlug: "raipur", now: NOW });
    expect(out.map((r) => r.id)).toEqual(["raipur-1"]);
    expect(diagnostics.droppedByScope.NATIONAL).toBe(1);
    expect(diagnostics.droppedByScope.STATEWIDE_CHHATTISGARH).toBe(1);
    expect(diagnostics.droppedByScope.UNKNOWN).toBe(1);
  });

  it("returns an EMPTY district feed rather than backfilling with unrelated news", () => {
    const { rows: out } = selectFeedRows(rows, { feed: "district", districtSlug: "korba", now: NOW });
    expect(out).toEqual([]);
  });

  it("a multi-district story appears in each named district", () => {
    const multi = row("multi", 1, "DISTRICT_SPECIFIC", {}, { primary_district: "raipur", districts: ["raipur", "durg"] });
    expect(selectFeedRows([multi], { feed: "district", districtSlug: "durg", now: NOW }).rows).toHaveLength(1);
  });

  it("requires a districtSlug for the district feed", () => {
    expect(() => selectFeedRows(rows, { feed: "district", now: NOW })).toThrow();
  });
});

describe("selectFeedRows — Chhattisgarh-first feeds", () => {
  const rows: FeedRow[] = [
    row("nat", 0.1, "NATIONAL"),
    row("intl", 0.1, "INTERNATIONAL"),
    row("unk", 0.1, "UNKNOWN"),
    row("cg-old", 20, "STATEWIDE_CHHATTISGARH"),
    row("cg-new", 1, "STATEWIDE_CHHATTISGARH"),
    row("d-mid", 5, "DISTRICT_SPECIFIC", {}, { primary_district: "raipur", districts: ["raipur"] }),
  ];

  it("cg_home keeps national / international / unknown out of the default feed", () => {
    const { rows: out } = selectFeedRows(rows, { feed: "cg_home", now: NOW });
    expect(out.map((r) => r.id)).toEqual(["cg-new", "d-mid", "cg-old"]);
  });

  it("chronological order is strictly newest-first regardless of scope or score", () => {
    const { rows: out } = selectFeedRows(rows, { feed: "cg_home", now: NOW, order: "chronological", score: (r) => (r.id === "cg-old" ? 1000 : 0) });
    expect(out.map((r) => r.id)).toEqual(["cg-new", "d-mid", "cg-old"]);
  });

  it("fresh_ranked never lets a high score lift an older freshness class above a newer one", () => {
    const { rows: out } = selectFeedRows(rows, { feed: "cg_home", now: NOW, order: "fresh_ranked", score: (r) => (r.id === "cg-old" ? 1000 : 1) });
    expect(out[0]!.id).toBe("cg-new"); // 1h (h1_3) beats a 20h story even at score 1000
    expect(out[out.length - 1]!.id).toBe("cg-old");
  });

  it("caps the controlled share of INDIA_RELEVANT_TO_CHHATTISGARH", () => {
    const many: FeedRow[] = [
      ...Array.from({ length: 10 }, (_, i) => row(`r${i}`, 1 + i * 0.1, "INDIA_RELEVANT_TO_CHHATTISGARH")),
      ...Array.from({ length: 10 }, (_, i) => row(`s${i}`, 1.05 + i * 0.1, "STATEWIDE_CHHATTISGARH")),
    ];
    const { rows: out } = selectFeedRows(many, { feed: "cg_home", now: NOW, maxIndiaRelevantShare: 0.2 });
    const relevant = out.filter((r) => r.id.startsWith("r")).length;
    expect(relevant / out.length).toBeLessThanOrEqual(0.25);
    expect(out.filter((r) => r.id.startsWith("s"))).toHaveLength(10);
  });

  it("national feed shows national + india-relevant only", () => {
    const { rows: out } = selectFeedRows(rows, { feed: "national", now: NOW });
    expect(out.map((r) => r.id)).toEqual(["nat"]);
  });

  it("maxAgeHours drops stale rows and diagnostics report the newest age", () => {
    const { rows: out, diagnostics } = selectFeedRows(rows, { feed: "cg_home", now: NOW, maxAgeHours: 12 });
    expect(out.map((r) => r.id)).toEqual(["cg-new", "d-mid"]);
    expect(diagnostics.newestAgeMinutes).toBe(60);
  });
});

describe("selectFeedRows — legacy rows without a stored scope", () => {
  const legacy: FeedRow[] = [
    { id: "l1", headline: "रायपुर में नई सड़क का उद्घाटन", published_at: ago(2), geo_metadata: { primary_district: "korba" } },
    { id: "l2", headline: "Local man wins lottery", published_at: ago(1) },
  ];

  it("never admits a headline-guessed district into a district feed", () => {
    // The text clearly says Raipur, but a legacy row has no STORED evidence-based scope: not proof for a district page.
    const raipur = selectFeedRows(legacy, { feed: "district", districtSlug: "raipur", now: NOW });
    expect(raipur.rows).toEqual([]);
    expect(raipur.diagnostics.droppedDerivedForDistrict).toBe(1);
    // and the stale stored primary_district "korba" is not trusted either
    expect(selectFeedRows(legacy, { feed: "district", districtSlug: "korba", now: NOW }).rows).toEqual([]);
  });

  it("still derives a COARSE scope from text for the Chhattisgarh-first feeds, and never invents a district for unknown copy", () => {
    const home = selectFeedRows(legacy, { feed: "cg_home", now: NOW });
    expect(home.rows.map((r) => r.id)).toEqual(["l1"]);
    expect(home.diagnostics.derivedScopeCount).toBe(2);
  });
});
