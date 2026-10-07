import { describe, expect, it } from "vitest";
import { buildFeedIntegrity, istDayStart, type FeedIntegrityRaw, type FeedIntegrityRow } from "@/lib/admin-ops/feed-integrity";

// 2026-10-07 12:00 UTC = 17:30 IST. The IST day started 2026-10-06T18:30:00Z.
const NOW = new Date("2026-10-07T12:00:00.000Z");
const H = 3_600_000;
const D = 24 * H;
const at = (ageMs: number) => new Date(NOW.getTime() - ageMs).toISOString();

function row(id: string, ageMs: number, scope: string, extra: Partial<FeedIntegrityRow> = {}, geo: Record<string, unknown> = {}): FeedIntegrityRow {
  return {
    id,
    slug: `s-${id}`,
    event_id: `e-${id}`,
    headline: `रायपुर में ${id} सड़क हादसा, पांच घायल`,
    summary: "सार",
    language: "hi",
    published_at: at(ageMs),
    created_at: at(ageMs),
    editorial_status: "approved",
    workflow_status: "published",
    geo_metadata: { scope, ...geo },
    has_en: true,
    has_hi: true,
    ...extra,
  } as FeedIntegrityRow;
}

const raw = (rows: FeedIntegrityRow[], signalAgeMs: number | null = 30 * 60_000): FeedIntegrityRaw => ({
  generated_at: NOW.toISOString(),
  newest_signal_created_at: signalAgeMs === null ? null : at(signalAgeMs),
  newest_signal_published_at: signalAgeMs === null ? null : at(signalAgeMs + H),
  rows,
});

describe("istDayStart", () => {
  it("is the IST midnight expressed in UTC", () => {
    expect(istDayStart(NOW).toISOString()).toBe("2026-10-06T18:30:00.000Z");
    expect(istDayStart(new Date("2026-10-07T20:00:00.000Z")).toISOString()).toBe("2026-10-07T18:30:00.000Z");
  });
});

describe("three separate freshness clocks", () => {
  it("reports ingestion, editorial and public-feed freshness independently", () => {
    const view = buildFeedIntegrity(
      raw(
        [
          // newest APPROVED row is a UNKNOWN-geography story: editorial clock sees it, the public feed does not
          row("unk", 1 * H, "UNKNOWN"),
          row("ok", 5 * H, "STATEWIDE_CHHATTISGARH"),
        ],
        20 * 60_000
      ),
      NOW
    );
    expect(view.freshness.ingestion.ageMinutes).toBe(20);
    expect(view.freshness.editorial.ageMinutes).toBe(60);
    expect(view.freshness.publicFeed.ageMinutes).toBe(300);
    expect(view.freshness.publicFeed.newestEligibleHeadline).toContain("ok");
    expect(view.freshness.stale).toBe(false);
  });

  it("flags a stale public feed and treats no data as critical, never as healthy", () => {
    const stale = buildFeedIntegrity(raw([row("old", 3 * D, "STATEWIDE_CHHATTISGARH")], 5 * D), NOW);
    expect(stale.freshness.stale).toBe(true);
    expect(stale.freshness.health24h).toBe("critical");
    const empty = buildFeedIntegrity(raw([], null), NOW);
    expect(empty.freshness.stale).toBe(true);
    expect(empty.freshness.ingestion.newestSignalAt).toBeNull();
    expect(empty.freshness.publicFeed.newestEligibleAt).toBeNull();
    expect(empty.freshness.publicFeed.tone).toBe("critical");
  });

  it("counts published stories in the last hour / 6 h / 24 h / 48 h", () => {
    const view = buildFeedIntegrity(
      raw([row("a", 0.5 * H, "STATEWIDE_CHHATTISGARH"), row("b", 3 * H, "STATEWIDE_CHHATTISGARH"), row("c", 20 * H, "STATEWIDE_CHHATTISGARH"), row("d", 40 * H, "STATEWIDE_CHHATTISGARH")]),
      NOW
    );
    expect(view.freshness).toMatchObject({ publishedLast1h: 1, publishedLast6h: 2, publishedLast24h: 3, publishedLast48h: 4 });
  });
});

describe("geography is reported by class and never combined into one 'news count'", () => {
  const rows = [
    row("d1", 1 * H, "DISTRICT_SPECIFIC", {}, { primary_district: "raipur", districts: ["raipur"], is_chhattisgarh: true }),
    row("d2", 2 * H, "DISTRICT_SPECIFIC", {}, { primary_district: "durg", districts: ["durg"], is_chhattisgarh: true }),
    row("s1", 3 * H, "STATEWIDE_CHHATTISGARH"),
    row("n1", 4 * H, "NATIONAL"),
    row("r1", 4.5 * H, "INDIA_RELEVANT_TO_CHHATTISGARH"),
    row("i1", 5 * H, "INTERNATIONAL"),
    row("u1", 6 * H, "UNKNOWN"),
    row("yesterday", 20 * H, "DISTRICT_SPECIFIC", {}, { primary_district: "raipur", districts: ["raipur"] }), // before the IST day start (17.5 h ago)
  ];
  const view = buildFeedIntegrity(raw(rows), NOW);

  it("splits today by class", () => {
    expect(view.geography.districtSpecificToday).toBe(2);
    expect(view.geography.statewideToday).toBe(1);
    expect(view.geography.indiaToday).toBe(2);
    expect(view.geography.internationalToday).toBe(1);
    expect(view.geography.chhattisgarhToday).toBe(3);
    expect(view.geography.unknownToday).toBe(0); // UNKNOWN is never public, so never counted as published-to-readers
  });

  it("keeps UNKNOWN out of everything readers can see but still reports it", () => {
    expect(view.geography.eligibleByClass.unknown).toBe(0);
    expect(view.geography.approvedUnknown).toBe(1);
  });

  it("reports what the Chhattisgarh-first Latest drops by scope", () => {
    expect(view.geography.latestDroppedByScope).toMatchObject({ NATIONAL: 1, INTERNATIONAL: 1, UNKNOWN: 1 });
    expect(view.freshness.publicFeed.eligibleLatest).toBeLessThan(view.freshness.publicFeed.eligiblePublicAll);
  });

  it("detects conflicting and leakage-candidate geography", () => {
    const bad = buildFeedIntegrity(
      raw([
        row("empty-district", H, "DISTRICT_SPECIFIC"),
        row("wrong", 2 * H, "DISTRICT_SPECIFIC", { headline: "दुर्ग में बड़ा हादसा, कई लोग घायल, प्रशासन ने जांच शुरू की" }, { primary_district: "raipur", districts: ["raipur"] }),
        row("cg-flag", 3 * H, "NATIONAL", {}, { is_chhattisgarh: true }),
      ]),
      NOW
    );
    expect(bad.geography.conflicting.map((c) => c.id).sort()).toEqual(["cg-flag", "empty-district"]);
    expect(bad.geography.districtLeakageCandidates).toEqual([{ id: "wrong", stored: "raipur", headlineSuggests: "durg" }]);
  });

  it("counts rows whose geography is text-derived (no stored scope) separately", () => {
    const legacy = buildFeedIntegrity(raw([row("legacy", H, "x", { geo_metadata: null })]), NOW);
    expect(legacy.geography.withoutStoredScope).toBe(1);
  });
});

describe("language", () => {
  it("reports language counts, missing and conflicting language, and bilingual coverage honestly", () => {
    const view = buildFeedIntegrity(
      raw([
        row("hi1", 1 * H, "STATEWIDE_CHHATTISGARH", { language: "hi", has_en: true }),
        row("hi2", 2 * H, "STATEWIDE_CHHATTISGARH", { language: "hi", has_en: false }),
        row("en1", 3 * H, "STATEWIDE_CHHATTISGARH", { language: "en", headline: "Five injured in Raipur road accident", has_hi: true }),
        row("miss", 4 * H, "STATEWIDE_CHHATTISGARH", { language: null }),
        row("conflict", 5 * H, "STATEWIDE_CHHATTISGARH", { language: "en" }), // Devanagari headline labelled English
      ]),
      NOW
    );
    expect(view.language.eligibleByLanguage).toMatchObject({ hi: 2, en: 2, missing: 1 });
    expect(view.language.missingLanguage).toBe(1);
    expect(view.language.conflicting).toBe(1);
    expect(view.language.bilingual).toMatchObject({ hiTotal: 2, hiWithEn: 1, enTotal: 2 });
    expect(view.language.bilingual.coveragePct).not.toBeNull();
  });

  it("returns null coverage when there is nothing to measure", () => {
    expect(buildFeedIntegrity(raw([]), NOW).language.bilingual.coveragePct).toBeNull();
  });
});

describe("the public gate is accounted for, not hidden", () => {
  it("reports pending, out-of-window and null-timestamp rows by reason", () => {
    const view = buildFeedIntegrity(
      raw([
        row("ok", H, "STATEWIDE_CHHATTISGARH"),
        row("pending", H, "STATEWIDE_CHHATTISGARH", { editorial_status: "pending" }),
        row("ancient", 45 * D, "STATEWIDE_CHHATTISGARH"),
        row("nots", H, "STATEWIDE_CHHATTISGARH", { published_at: null }),
        row("generic", H, "STATEWIDE_CHHATTISGARH", { headline: "Regional News Update" }),
      ]),
      NOW
    );
    expect(view.freshness.publicFeed.eligiblePublicAll).toBe(1);
    expect(view.gate.droppedByReason).toMatchObject({ not_public_status: 1, outside_window: 1, no_published_at: 1, unfit_headline: 1 });
    expect(view.gate.pendingOrRejected).toBe(1);
  });
});
