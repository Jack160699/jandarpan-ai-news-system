/**
 * Unit tests — district routing and matching use STORED, evidence-based geography only.
 */
import { describe, expect, it } from "vitest";
import {
  buildHyperlocalFeedBundle,
  partitionDistrictHubRows,
  rowMatchesDistrict,
  routeArticlesByDistrict,
} from "@/lib/regional/hyperlocal-feed";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const NOW = Date.now();
const iso = (ageHours: number) => new Date(NOW - ageHours * 3_600_000).toISOString();

function row(
  partial: Partial<GeneratedArticleRow> & Pick<GeneratedArticleRow, "id" | "headline">
): GeneratedArticleRow {
  return {
    event_id: null,
    slug: partial.slug ?? partial.id,
    summary: partial.summary ?? null,
    article_body: null,
    hero_image_url: null,
    seo_title: null,
    seo_description: null,
    reading_time: null,
    language: "hi",
    tags: [],
    published_at: iso(2),
    editorial_status: "approved",
    editorial_metadata: {},
    created_at: iso(2),
    ...partial,
  } as GeneratedArticleRow;
}

const district = (slug: string, extra: Record<string, unknown> = {}) => ({
  scope: "DISTRICT_SPECIFIC",
  primary_district: slug,
  districts: [slug],
  is_chhattisgarh: true,
  ...extra,
});
const statewide = { scope: "STATEWIDE_CHHATTISGARH", primary_district: null, districts: [], is_chhattisgarh: true };

describe("rowMatchesDistrict — stored evidence only", () => {
  it("matches a stored DISTRICT_SPECIFIC row for exactly that district", () => {
    const r = row({ id: "1", headline: "नगर निगम की बैठक में बजट पर चर्चा", geo_metadata: district("durg") });
    expect(rowMatchesDistrict(r, "durg")).toBe(true);
    expect(rowMatchesDistrict(r, "raipur")).toBe(false);
  });

  it("resolves a district alias to the canonical slug", () => {
    const r = row({ id: "1", headline: "बस्तर में भारी बारिश से स्कूल बंद", geo_metadata: district("bastar") });
    expect(rowMatchesDistrict(r, "jagdalpur")).toBe(true);
  });

  it("does NOT re-tag a statewide story as a district story because the headline names the district", () => {
    const r = row({
      id: "2",
      headline: "दुर्ग में सड़क मरम्मत का काम शुरू",
      summary: "भिलाई क्षेत्र में यातायात प्रभावित।",
      geo_metadata: statewide,
    });
    expect(rowMatchesDistrict(r, "durg")).toBe(false);
  });

  it("does NOT match from tags alone", () => {
    const r = row({ id: "3", headline: "दुर्ग और भिलाई का जल निकासी आधुनिकीकरण प्लान", tags: ["durg", "chhattisgarh"], geo_metadata: statewide });
    expect(rowMatchesDistrict(r, "durg")).toBe(false);
  });

  it("does NOT match a legacy row with no stored scope, even when the text clearly names the district", () => {
    const r = row({ id: "4", headline: "बस्तर में भारी बारिश के चलते स्कूल बंद", tags: ["bastar"], geo_metadata: { primary_district: "bastar", districts: ["bastar"] } });
    expect(rowMatchesDistrict(r, "bastar")).toBe(false);
  });

  it("never matches unknown, national or international geography", () => {
    for (const scope of ["UNKNOWN", "NATIONAL", "INTERNATIONAL", "INDIA_RELEVANT_TO_CHHATTISGARH"]) {
      const r = row({ id: scope, headline: "रायपुर से जुड़ी एक खबर पर बयान", geo_metadata: { scope, primary_district: "raipur", districts: ["raipur"] } });
      expect(rowMatchesDistrict(r, "raipur")).toBe(false);
    }
  });
});

describe("routeArticlesByDistrict", () => {
  it("routes by stored scope, sends statewide to its own bucket and drops everything else", () => {
    const rows = [
      row({ id: "d1", headline: "दुर्ग नगर निगम की बैठक में बजट पास", geo_metadata: district("durg") }),
      row({ id: "m1", headline: "रायपुर और दुर्ग को जोड़ने वाली सड़क मंजूर", geo_metadata: district("raipur", { districts: ["raipur", "durg"] }) }),
      row({ id: "s1", headline: "राज्य सरकार ने धान खरीदी की तारीख बढ़ाई", geo_metadata: statewide }),
      row({ id: "n1", headline: "संसद में नया विधेयक पेश किया गया", geo_metadata: { scope: "NATIONAL" } }),
      row({ id: "u1", headline: "रायपुर के एक व्यक्ति ने जीती लॉटरी", geo_metadata: { scope: "UNKNOWN" } }),
      row({ id: "old", headline: "दुर्ग में पुरानी खबर का मामला फिर उठा", geo_metadata: district("durg"), published_at: iso(24 * 45) }),
    ];
    const routed = routeArticlesByDistrict(rows);
    expect(routed.get("durg")?.map((r) => r.id).sort()).toEqual(["d1", "m1"]);
    expect(routed.get("raipur")?.map((r) => r.id)).toEqual(["m1"]);
    expect(routed.get("statewide")?.map((r) => r.id)).toEqual(["s1"]);
    expect([...routed.keys()].sort()).toEqual(["durg", "raipur", "statewide"]);
  });

  it("orders each bucket newest-first", () => {
    const rows = [
      row({ id: "a", headline: "दुर्ग में बिजली कटौती से लोग परेशान", geo_metadata: district("durg"), published_at: iso(5) }),
      row({ id: "b", headline: "दुर्ग में नई सड़क का उद्घाटन हुआ", geo_metadata: district("durg"), published_at: iso(1) }),
      row({ id: "c", headline: "दुर्ग में स्कूल भवन का शिलान्यास किया गया", geo_metadata: district("durg"), published_at: iso(3) }),
    ];
    expect(routeArticlesByDistrict(rows).get("durg")?.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });
});

describe("buildHyperlocalFeedBundle", () => {
  it("never lets a regional score lift an older story above a newer one inside a district strip", () => {
    const rows = [
      row({ id: "old-hot", headline: "दुर्ग में बड़ा हादसा, कई लोग घायल, अस्पताल में भर्ती", tags: ["breaking"], geo_metadata: district("durg"), published_at: iso(20) }),
      row({ id: "new-plain", headline: "दुर्ग में आज बाजार खुला रहेगा, प्रशासन ने दी जानकारी", geo_metadata: district("durg"), published_at: iso(1) }),
    ];
    const bundle = buildHyperlocalFeedBundle(rows, { maxDistricts: 4, displayLanguage: "hi" });
    const durg = bundle.feeds.find((f) => f.districtSlug === "durg");
    expect(durg?.articles.map((a) => a.id)).toEqual(["new-plain", "old-hot"]);
  });
});

describe("partitionDistrictHubRows", () => {
  it("keeps exact stored-district stories in primary and does not mix fallback", () => {
    const rows = [
      row({ id: "d1", headline: "दुर्ग नगर निगम बैठक में बजट पर चर्चा", geo_metadata: district("durg"), published_at: iso(1) }),
      row({ id: "d2", headline: "भिलाई इस्पात संयंत्र में उत्पादन बढ़ा", geo_metadata: district("durg"), published_at: iso(2) }),
      row({ id: "d3", headline: "दुर्ग जिला अस्पताल में नई मशीन लगी", geo_metadata: district("durg"), published_at: iso(3) }),
      row({ id: "d4", headline: "दुर्ग में बिजली आपूर्ति सुधारने का काम शुरू", geo_metadata: district("durg"), published_at: iso(4) }),
      row({ id: "r1", headline: "रायपुर में विधानसभा सत्र की तैयारी पूरी", geo_metadata: district("raipur") }),
    ];
    const { primary, fallback } = partitionDistrictHubRows(rows, "durg", { minPrimary: 4 });
    expect(primary.map((r) => r.id).sort()).toEqual(["d1", "d2", "d3", "d4"]);
    expect(fallback).toHaveLength(0);
  });

  it("returns only the stored-district story as primary when inventory is thin; fallback stays separate", () => {
    const rows = [
      row({ id: "d1", headline: "दुर्ग में नई योजना की घोषणा की गई", geo_metadata: district("durg") }),
      row({ id: "r1", headline: "रायपुर विकास योजना को मंजूरी मिली", geo_metadata: district("raipur") }),
    ];
    const { primary, fallback } = partitionDistrictHubRows(rows, "durg", { minPrimary: 4, maxFallback: 5 });
    expect(primary.map((r) => r.id)).toEqual(["d1"]);
    expect(fallback.map((r) => r.id)).toEqual(["r1"]);
  });
});
