import { describe, expect, it } from "vitest";
import { checkPublicRow, dedupeRowsNewestWins, startOfUtcDay } from "@/lib/feed/public-eligibility";
import { selectFeedRows, type FeedRow } from "@/lib/feed/feed-selector";
import { comparePublishedDesc } from "@/lib/feed/freshness";
import { geographyClassOf } from "@/lib/news/geo/geo-scope";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const H = 3_600_000;
const D = 24 * H;
const at = (ageMs: number) => new Date(NOW.getTime() - ageMs).toISOString();

function row(id: string, ageMs: number, extra: Partial<FeedRow> = {}, scope = "STATEWIDE_CHHATTISGARH"): FeedRow {
  return {
    id,
    slug: `slug-${id}`,
    headline: `रायपुर में ${id} सड़क हादसा, पांच घायल`,
    published_at: at(ageMs),
    editorial_status: "approved",
    geo_metadata: { scope },
    ...extra,
  };
}
const ids = (rows: FeedRow[]) => rows.map((r) => r.id);

function districtRow(id: string, slug: string, ageMs: number, districts: string[] = [slug]): FeedRow {
  return { ...row(id, ageMs), geo_metadata: { scope: "DISTRICT_SPECIFIC", primary_district: slug, districts } };
}

describe("public gate: status", () => {
  it.each(["approved", "published", "live"])("admits %s", (s) => {
    expect(checkPublicRow(row("a", H, { editorial_status: s }), NOW).eligible).toBe(true);
  });
  it.each(["pending", "rejected", "archived"])("rejects %s", (s) => {
    expect(checkPublicRow(row("a", H, { editorial_status: s }), NOW)).toEqual({ eligible: false, reason: "not_public_status" });
  });
  it("rejects an archived workflow even when the editorial status is approved", () => {
    expect(checkPublicRow(row("a", H, { workflow_status: "archived" }), NOW).eligible).toBe(false);
  });
});

describe("public gate: 30-day window and timestamps", () => {
  it("admits just inside the window and rejects just outside it", () => {
    expect(checkPublicRow(row("in", 30 * D - 60_000), NOW).eligible).toBe(true);
    expect(checkPublicRow(row("out", 30 * D + 60_000), NOW)).toEqual({ eligible: false, reason: "outside_window" });
  });
  it("rejects a null timestamp and never substitutes created_at", () => {
    const r = row("n", H, { published_at: null, created_at: at(H) });
    expect(checkPublicRow(r, NOW)).toEqual({ eligible: false, reason: "no_published_at" });
  });
  it("rejects an invalid timestamp string", () => {
    expect(checkPublicRow(row("bad", H, { published_at: "not-a-date" }), NOW).eligible).toBe(false);
  });
  it("tolerates small future clock skew but rejects a far-future timestamp", () => {
    expect(checkPublicRow(row("skew", -30 * 60_000), NOW).eligible).toBe(true);
    expect(checkPublicRow(row("future", -3 * D), NOW).eligible).toBe(false);
  });
});

describe("public gate: slug and headline", () => {
  it("rejects an empty slug but allows an absent slug field", () => {
    expect(checkPublicRow(row("a", H, { slug: "  " }), NOW)).toEqual({ eligible: false, reason: "missing_slug" });
    const { slug: dropped, ...noSlug } = row("a", H);
    expect(dropped).toBeDefined();
    expect(checkPublicRow(noSlug as FeedRow, NOW).eligible).toBe(true);
  });
  it.each([
    "Regional News Update",
    "Latest News Update",
    "Breaking News Update",
    "छत्तीसगढ़ समाचार",
    "29 सितंबर के मुख्य और ताजा समाचार: देश-दुनिया की लाइव ब्रेकिंग न्यूज अपडेट",
    "Desk draft 2026-09-26",
    "",
  ])("rejects unfit headline %j", (headline) => {
    expect(checkPublicRow(row("a", H, { headline }), NOW)).toEqual({ eligible: false, reason: "unfit_headline" });
  });
});

describe("selectFeedRows: Latest ordering", () => {
  it("is strictly newest-first and ignores insertion order", () => {
    const shuffled = [row("c", 3 * H), row("a", 1 * H), row("d", 9 * H), row("b", 2 * H)];
    expect(ids(selectFeedRows(shuffled, { feed: "cg_home", now: NOW }).rows)).toEqual(["a", "b", "c", "d"]);
  });

  it("breaks equal timestamps deterministically (id desc) whatever the input order", () => {
    const t = 5 * H;
    const a = [row("x1", t), row("x3", t), row("x2", t)];
    const b = [row("x2", t), row("x1", t), row("x3", t)];
    const out1 = ids(selectFeedRows(a, { feed: "cg_home", now: NOW }).rows);
    const out2 = ids(selectFeedRows(b, { feed: "cg_home", now: NOW }).rows);
    expect(out1).toEqual(["x3", "x2", "x1"]);
    expect(out2).toEqual(out1);
  });

  it("keeps ordering stable across pagination boundaries (page 2 continues exactly where page 1 stopped)", () => {
    const all = Array.from({ length: 25 }, (_, i) => row(`p${String(i).padStart(2, "0")}`, (i % 7) * H + 60_000));
    const full = ids(selectFeedRows(all, { feed: "cg_home", now: NOW }).rows);
    const expected = [...all].sort(comparePublishedDesc).map((r) => r.id);
    expect(full).toEqual(expected);
    const page1 = full.slice(0, 10);
    const page2 = full.slice(10, 20);
    expect(new Set([...page1, ...page2]).size).toBe(20);
    expect(page1[9]).toBe(expected[9]);
    expect(page2[0]).toBe(expected[10]);
  });

  it("never lets a stale record sit above a newer one", () => {
    const out = selectFeedRows([row("old", 29 * D), row("new", 10 * 60_000), row("mid", 3 * D)], { feed: "cg_home", now: NOW });
    expect(ids(out.rows)).toEqual(["new", "mid", "old"]);
  });

  it("drops records outside the 30-day window, null timestamps and non-public statuses together", () => {
    const rows = [
      row("ok", H),
      row("ancient", 45 * D),
      row("nullts", H, { published_at: null }),
      row("pending", H, { editorial_status: "pending" }),
    ];
    const { rows: out, diagnostics } = selectFeedRows(rows, { feed: "cg_home", now: NOW });
    expect(ids(out)).toEqual(["ok"]);
    expect(diagnostics.droppedByGate).toMatchObject({ outside_window: 1, no_published_at: 1, not_public_status: 1 });
  });

  it("collapses duplicate records (same id or same slug) keeping the newest", () => {
    const rows = [row("a", 5 * H), row("a", 1 * H), row("b", 2 * H, { slug: "slug-a" })];
    const { rows: out, diagnostics } = selectFeedRows(rows, { feed: "cg_home", now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0]!.published_at).toBe(at(1 * H));
    expect(diagnostics.droppedByGate.duplicate).toBe(2);
  });

  it("returns an empty list, not stale filler, when nothing is eligible", () => {
    expect(selectFeedRows([row("ancient", 60 * D)], { feed: "cg_home", now: NOW }).rows).toEqual([]);
  });
});

describe("selectFeedRows: district isolation with stored geography", () => {
  it("a district feed contains only stored DISTRICT_SPECIFIC rows for that district", () => {
    const rows = [
      districtRow("r1", "raipur", H),
      districtRow("d1", "durg", H),
      row("state", H, {}, "STATEWIDE_CHHATTISGARH"),
      row("india", H, {}, "NATIONAL"),
      row("intl", H, {}, "INTERNATIONAL"),
      row("unk", H, {}, "UNKNOWN"),
      row("nogeo", H, { geo_metadata: null }),
    ];
    expect(ids(selectFeedRows(rows, { feed: "district", districtSlug: "raipur", now: NOW }).rows)).toEqual(["r1"]);
  });

  it("does not use the headline or the source name to place a story in a district", () => {
    const guessed = row("guess", H, { headline: "रायपुर के बाजार में आग, दमकल मौके पर पहुंची", geo_metadata: { scope: "STATEWIDE_CHHATTISGARH" } });
    expect(selectFeedRows([guessed], { feed: "district", districtSlug: "raipur", now: NOW }).rows).toEqual([]);
  });

  it("excludes ambiguous geography: a multi-district story only appears in districts it names", () => {
    const multi = districtRow("m", "raipur", H, ["raipur", "durg"]);
    expect(selectFeedRows([multi], { feed: "district", districtSlug: "korba", now: NOW }).rows).toEqual([]);
    expect(selectFeedRows([multi], { feed: "district", districtSlug: "durg", now: NOW }).rows).toHaveLength(1);
  });
});

describe("public_all feed (category / search / RSS)", () => {
  it("allows every geography except UNKNOWN", () => {
    const rows = [
      row("d", H, {}, "DISTRICT_SPECIFIC"),
      row("s", H, {}, "STATEWIDE_CHHATTISGARH"),
      row("n", H, {}, "NATIONAL"),
      row("i", H, {}, "INTERNATIONAL"),
      row("u", H, {}, "UNKNOWN"),
    ];
    expect(ids(selectFeedRows(rows, { feed: "public_all", now: NOW }).rows).sort()).toEqual(["d", "i", "n", "s"]);
  });
});

describe("geography model", () => {
  it("preserves the differences between district, statewide, india, international and unknown", () => {
    expect(geographyClassOf("DISTRICT_SPECIFIC")).toBe("district");
    expect(geographyClassOf("STATEWIDE_CHHATTISGARH")).toBe("chhattisgarh_statewide");
    expect(geographyClassOf("NATIONAL")).toBe("india");
    expect(geographyClassOf("INDIA_RELEVANT_TO_CHHATTISGARH")).toBe("india");
    expect(geographyClassOf("INTERNATIONAL")).toBe("international");
    expect(geographyClassOf("UNKNOWN")).toBe("unknown");
    expect(geographyClassOf(null)).toBe("unknown");
    expect(geographyClassOf(undefined)).toBe("unknown");
  });
});

describe("helpers", () => {
  it("dedupes by id and case-insensitive slug, first wins", () => {
    const out = dedupeRowsNewestWins([
      { id: "1", slug: "A" },
      { id: "2", slug: "a" },
      { id: "1", slug: "z" },
      { id: "3", slug: null },
    ]);
    expect(out.map((r) => r.id)).toEqual(["1", "3"]);
  });
  it("startOfUtcDay is the UTC midnight", () => {
    expect(startOfUtcDay(new Date("2026-10-07T23:59:59.000Z")).toISOString()).toBe("2026-10-07T00:00:00.000Z");
  });
});
