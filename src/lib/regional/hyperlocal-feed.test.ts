/**
 * Unit tests — My District hub partitioning + content retag matching.
 */
import { describe, expect, it } from "vitest";
import {
  partitionDistrictHubRows,
  rowMatchesDistrict,
} from "@/lib/regional/hyperlocal-feed";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

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
    published_at: "2026-07-20T10:00:00.000Z",
    editorial_metadata: {},
    created_at: "2026-07-20T10:00:00.000Z",
    ...partial,
  };
}

describe("rowMatchesDistrict", () => {
  it("matches stored primary_district", () => {
    const r = row({
      id: "1",
      headline: "Statewide note",
      geo_metadata: {
        state: "chhattisgarh",
        districts: ["durg"],
        primary_district: "durg",
        confidence: 0.9,
        is_chhattisgarh: true,
        tagged_at: "2026-07-20T10:00:00.000Z",
      },
    });
    expect(rowMatchesDistrict(r, "durg")).toBe(true);
    expect(rowMatchesDistrict(r, "raipur")).toBe(false);
  });

  it("retags statewide metadata when headline names the district", () => {
    const r = row({
      id: "2",
      headline: "दुर्ग में सड़क मरम्मत का काम शुरू",
      summary: "भिलाई क्षेत्र में यातायात प्रभावित।",
      geo_metadata: {
        state: "chhattisgarh",
        districts: [],
        primary_district: null,
        confidence: 0.5,
        is_chhattisgarh: true,
        tagged_at: "2026-07-20T10:00:00.000Z",
        classification_kind: "statewide",
      },
    });
    expect(rowMatchesDistrict(r, "durg")).toBe(true);
  });
});

describe("partitionDistrictHubRows", () => {
  it("keeps exact district stories in primary and does not mix fallback", () => {
    const rows = [
      row({
        id: "d1",
        headline: "दुर्ग नगर निगम बैठक",
        geo_metadata: {
          state: "chhattisgarh",
          districts: ["durg"],
          primary_district: "durg",
          confidence: 0.95,
          is_chhattisgarh: true,
          tagged_at: "2026-07-20T10:00:00.000Z",
        },
      }),
      row({
        id: "d2",
        headline: "भिलाई इस्पात संयंत्र अपडेट",
        geo_metadata: {
          state: "chhattisgarh",
          districts: ["durg"],
          primary_district: "durg",
          confidence: 0.9,
          is_chhattisgarh: true,
          tagged_at: "2026-07-20T10:00:00.000Z",
        },
      }),
      row({
        id: "d3",
        headline: "दुर्ग जिला अस्पताल",
        geo_metadata: {
          state: "chhattisgarh",
          districts: ["durg"],
          primary_district: "durg",
          confidence: 0.9,
          is_chhattisgarh: true,
          tagged_at: "2026-07-20T10:00:00.000Z",
        },
      }),
      row({
        id: "d4",
        headline: "दुर्ग में बिजली आपूर्ति",
        geo_metadata: {
          state: "chhattisgarh",
          districts: ["durg"],
          primary_district: "durg",
          confidence: 0.9,
          is_chhattisgarh: true,
          tagged_at: "2026-07-20T10:00:00.000Z",
        },
      }),
      row({
        id: "r1",
        headline: "रायपुर में विधानसभा सत्र",
        geo_metadata: {
          state: "chhattisgarh",
          districts: ["raipur"],
          primary_district: "raipur",
          confidence: 0.9,
          is_chhattisgarh: true,
          tagged_at: "2026-07-20T10:00:00.000Z",
        },
      }),
    ];

    const { primary, fallback } = partitionDistrictHubRows(rows, "durg", {
      minPrimary: 4,
    });
    expect(primary.map((r) => r.id)).toEqual(["d1", "d2", "d3", "d4"]);
    expect(fallback).toHaveLength(0);
  });

  it("adds labeled CG fallback only when primary inventory is thin", () => {
    const rows = [
      row({
        id: "d1",
        headline: "दुर्ग में अपडेट",
        geo_metadata: {
          state: "chhattisgarh",
          districts: ["durg"],
          primary_district: "durg",
          confidence: 0.9,
          is_chhattisgarh: true,
          tagged_at: "2026-07-20T10:00:00.000Z",
        },
      }),
      row({
        id: "r1",
        headline: "रायपुर विकास योजना",
        geo_metadata: {
          state: "chhattisgarh",
          districts: ["raipur"],
          primary_district: "raipur",
          confidence: 0.9,
          is_chhattisgarh: true,
          tagged_at: "2026-07-20T10:00:00.000Z",
        },
      }),
    ];

    const { primary, fallback } = partitionDistrictHubRows(rows, "durg", {
      minPrimary: 4,
      maxFallback: 5,
    });
    expect(primary).toHaveLength(1);
    expect(fallback.map((r) => r.id)).toEqual(["r1"]);
  });

  it("matches Durg and Bhilai stories from fallback pool and isolates strictly", () => {
    const durgStory1 = row({
      id: "durg-1",
      slug: "durg-bhilai-drainage-modernization-municipal-corporation",
      headline: "दुर्ग और भिलाई नगर निगम का जल निकासी आधुनिकीकरण प्लान",
      tags: ["durg", "infrastructure", "chhattisgarh"],
    });
    const durgStory2 = row({
      id: "durg-2",
      slug: "chhattisgarh-sub-junior-hockey-team-selected-durg",
      headline: "छत्तीसगढ़ की सब-जूनियर राष्ट्रीय हॉकी टीम घोषित, दुर्ग और भिलाई के खिलाड़ी चयनित",
      tags: ["sports", "durg", "chhattisgarh"],
    });
    const bastarStory = row({
      id: "bastar-1",
      slug: "bastar-monsoon-rain-schools-closed",
      headline: "बस्तर में भारी बारिश के चलते स्कूल बंद",
      tags: ["weather", "bastar", "chhattisgarh"],
    });

    expect(rowMatchesDistrict(durgStory1, "durg")).toBe(true);
    expect(rowMatchesDistrict(durgStory2, "durg")).toBe(true);
    expect(rowMatchesDistrict(bastarStory, "durg")).toBe(false);
  });
});

