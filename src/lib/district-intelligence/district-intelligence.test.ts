/**
 * District intelligence unit tests — resolution, ranking, nearby, state section.
 */

import { describe, expect, it } from "vitest";
import type { HomeArticle } from "@/lib/homepage/types";
import {
  composeDistrictDashboard,
  composeMeraJila,
  classifyForChhattisgarhSection,
  DEFAULT_DISTRICT_SLUG,
  districtFromCoordinates,
  getNearbyDistricts,
  MERA_JILA_MIN_EXACT,
  rankDistrictStories,
  resolveDistrictPreference,
} from "@/lib/district-intelligence";
import { filterArticlesByDistrict } from "@/lib/homepage/district-filter";

function article(
  partial: Partial<HomeArticle> & Pick<HomeArticle, "id" | "headline">
): HomeArticle {
  return {
    slug: partial.slug ?? partial.id,
    summary: partial.summary ?? "",
    imageUrl: partial.imageUrl ?? "",
    ogImageUrl: partial.ogImageUrl ?? "",
    section: partial.section ?? "chhattisgarh",
    readingTime: partial.readingTime ?? "3 min",
    publishedAt: partial.publishedAt ?? "2026-07-21T10:00:00.000Z",
    isLive: partial.isLive ?? false,
    urgency: partial.urgency ?? "medium",
    trendScore: partial.trendScore ?? 10,
    priorityScore: partial.priorityScore ?? 10,
    ranking: partial.ranking ?? {
      priorityScore: partial.priorityScore ?? 10,
      reasons: [],
      isTrending: false,
      isBreaking: false,
      duplicateClusterId: null,
    },
    language: partial.language ?? "hi",
    tags: partial.tags ?? [],
    aiConfidence: partial.aiConfidence ?? 0.7,
    sourceCount: partial.sourceCount ?? 1,
    categoryLabel: partial.categoryLabel ?? "Local",
    desk: partial.desk ?? {
      id: "regional-bureau",
      name: "Regional Bureau",
      nameHi: "क्षेत्रीय ब्यूरो",
    },
    ...partial,
  };
}

describe("resolveDistrictPreference", () => {
  it("follows explicit > profile > local > geo > Raipur", () => {
    expect(
      resolveDistrictPreference({
        explicitSlug: "durg",
        profileSlug: "bilaspur",
        localSlug: "korba",
        geoSlug: "bastar",
      }).slug
    ).toBe("durg");

    expect(
      resolveDistrictPreference({
        profileSlug: "bilaspur",
        localSlug: "korba",
        geoSlug: "bastar",
      }).slug
    ).toBe("bilaspur");

    expect(
      resolveDistrictPreference({
        localSlug: "korba",
        districtSource: "local",
        geoSlug: "bastar",
        locationPermission: "granted",
      }).slug
    ).toBe("korba");

    expect(
      resolveDistrictPreference({
        geoSlug: "bastar",
        locationPermission: "granted",
      }).slug
    ).toBe("bastar");

    expect(resolveDistrictPreference({}).slug).toBe(DEFAULT_DISTRICT_SLUG);
    expect(resolveDistrictPreference({}).source).toBe("default_raipur");
  });

  it("does not treat default Raipur as a saved local preference over geo", () => {
    const r = resolveDistrictPreference({
      localSlug: "raipur",
      districtSource: null,
      geoSlug: "durg",
      locationPermission: "granted",
    });
    expect(r.slug).toBe("durg");
    expect(r.source).toBe("geo");
  });

  it("manual lock blocks geolocation overwrite", () => {
    const r = resolveDistrictPreference({
      localSlug: "durg",
      districtSource: "explicit",
      geoSlug: "rajnandgaon",
      locationPermission: "granted",
      manualLock: true,
    });
    expect(r.slug).toBe("durg");
  });

  it("ignores unknown district slugs", () => {
    expect(
      resolveDistrictPreference({ explicitSlug: "not-a-district" }).slug
    ).toBe(DEFAULT_DISTRICT_SLUG);
  });

  it("does not use geo after denial", () => {
    const r = resolveDistrictPreference({
      geoSlug: "durg",
      locationPermission: "denied",
    });
    expect(r.slug).toBe(DEFAULT_DISTRICT_SLUG);
  });
});

describe("districtFromCoordinates / nearby", () => {
  it("maps Durg HQ coords to durg", () => {
    const match = districtFromCoordinates({ lat: 21.1938, lng: 81.3509 });
    expect(match?.slug).toBe("durg");
  });

  it("maps Raipur HQ coords to raipur", () => {
    const match = districtFromCoordinates({ lat: 21.2514, lng: 81.6296 });
    expect(match?.slug).toBe("raipur");
  });

  it("lists Rajnandgaon as nearby to Durg", () => {
    const nearby = getNearbyDistricts("durg");
    expect(nearby.some((n) => n.slug === "rajnandgaon")).toBe(true);
  });

  it("rejects coords far from any CG district", () => {
    expect(districtFromCoordinates({ lat: 28.6, lng: 77.2 })).toBeNull();
  });
});

describe("district lead ranking", () => {
  const nowMs = Date.parse("2026-07-21T12:00:00.000Z");

  it("ranks exact Durg breaking ahead of newer Rajnandgaon", () => {
    const durgBreaking = article({
      id: "durg-1",
      headline: "दुर्ग में बड़ी घटना — पुलिस अलर्ट",
      publishedAt: "2026-07-21T08:00:00.000Z",
      urgency: "high",
      ranking: {
        priorityScore: 20,
        reasons: [],
        isTrending: false,
        isBreaking: true,
        duplicateClusterId: null,
      },
    });
    const rajnNewer = article({
      id: "rajn-1",
      headline: "राजनांदगाँव में नई सड़क योजना",
      publishedAt: "2026-07-21T11:30:00.000Z",
      priorityScore: 40,
    });

    const { lead } = rankDistrictStories([rajnNewer, durgBreaking], "durg", {
      nowMs,
    });
    expect(lead?.article.id).toBe("durg-1");
    expect(lead?.reason).toBe("exact_district_breaking");
  });

  it("does not let nearby lead when exact inventory exists", () => {
    const mera = composeMeraJila(
      [
        article({
          id: "durg-a",
          headline: "दुर्ग नगर निगम बैठक",
          publishedAt: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "durg-b",
          headline: "भिलाई इस्पात संयंत्र अपडेट",
        }),
        article({
          id: "durg-c",
          headline: "दुर्ग में यातायात व्यवस्था",
        }),
        article({
          id: "rajn-hot",
          headline: "राजनांदगाँव में ताज़ा ब्रेकिंग",
          urgency: "high",
          ranking: {
            priorityScore: 99,
            reasons: [],
            isTrending: true,
            isBreaking: true,
            duplicateClusterId: null,
          },
          publishedAt: "2026-07-21T11:55:00.000Z",
        }),
      ],
      "durg",
      { nowMs, minExact: MERA_JILA_MIN_EXACT }
    );

    expect(mera.lead?.article.id).not.toBe("rajn-hot");
    expect(mera.lead?.kind).toBe("exact");
    expect(mera.usedNearbyFallback).toBe(false);
    expect(mera.nearbyStories).toHaveLength(0);
  });

  it("uses nearby fallback only when exact inventory is insufficient", () => {
    const mera = composeMeraJila(
      [
        article({ id: "durg-only", headline: "दुर्ग में एक खबर" }),
        article({
          id: "rajn-1",
          headline: "राजनांदगाँव बाजार समाचार",
        }),
        article({
          id: "rajn-2",
          headline: "राजनांदगाँव पुलिस अपडेट",
        }),
      ],
      "durg",
      { nowMs, minExact: 3 }
    );

    expect(mera.exactCount).toBe(1);
    expect(mera.usedNearbyFallback).toBe(true);
    expect(mera.nearbyStories.length).toBeGreaterThan(0);
    expect(mera.nearbyStories[0].nearbyLabelHi).toBe("आसपास की खबरें");
  });

  it("suppresses duplicate clusters", () => {
    const a = article({
      id: "a1",
      headline: "दुर्ग बाढ़ अपडेट",
      ranking: {
        priorityScore: 30,
        reasons: [],
        isTrending: false,
        isBreaking: false,
        duplicateClusterId: "cluster-flood",
      },
    });
    const b = article({
      id: "a2",
      headline: "दुर्ग बाढ़ अपडेट दोबारा",
      ranking: {
        priorityScore: 28,
        reasons: [],
        isTrending: false,
        isBreaking: false,
        duplicateClusterId: "cluster-flood",
      },
    });
    const { ranked } = rankDistrictStories([a, b], "durg", { nowMs });
    expect(ranked).toHaveLength(1);
  });

  it("exposes deterministic ranking reasons", () => {
    const scored = rankDistrictStories(
      [article({ id: "x", headline: "छत्तीसगढ़ सरकार की नई नीति" })],
      "durg",
      { nowMs }
    );
    expect(scored.lead?.reason).toMatch(
      /statewide_relevant|state_fallback|default_raipur/
    );
    expect(scored.lead?.signals.length).toBeGreaterThan(0);
  });
});

describe("filterArticlesByDistrict — no hash mis-bucket", () => {
  it("does not assign Rajnandgaon stories into Durg pool", () => {
    const pool = [
      article({ id: "r1", headline: "राजनांदगाँव में विकास कार्य" }),
      article({ id: "d1", headline: "दुर्ग में विकास कार्य" }),
    ];
    const durg = filterArticlesByDistrict(pool, "durg");
    expect(durg.map((a) => a.id)).toEqual(["d1"]);
  });
});

describe("Chhattisgarh state classification", () => {
  it("marks cabinet / assembly as state-lead eligible", () => {
    const c = classifyForChhattisgarhSection({
      title: "Cabinet approves new statewide education policy in Chhattisgarh",
      body: "Vidhan Sabha session discussed the scheme",
    });
    expect(c.isStateLeadEligible).toBe(true);
    expect(c.isHyperlocal).toBe(false);
    expect(c.reasons.length).toBeGreaterThan(0);
  });

  it("excludes routine hyperlocal school visit from state lead", () => {
    const c = classifyForChhattisgarhSection({
      title: "Durg school visit to Vidhan Sabha for students",
      body: "Local school function and school visit by class 10 students",
      category: "local",
    });
    expect(c.isStateLeadEligible).toBe(false);
    expect(c.isHyperlocal).toBe(true);
    expect(c.reasons).toContain("hyperlocal_excluded");
  });
});

describe("district dashboard composition", () => {
  it("hides fuel/power modules without real data and never invents ₹0", () => {
    const dash = composeDistrictDashboard({
      districtSlug: "durg",
      articles: [
        article({ id: "d1", headline: "दुर्ग में नगर निगम बैठक" }),
        article({ id: "d2", headline: "दुर्ग पुलिस यातायात अलर्ट" }),
      ],
      weather: { temperatureC: 32, districtSlug: "durg" },
      fuelRates: null,
      powerInfo: null,
    });

    const fuel = dash.modules.find((m) => m.id === "fuel");
    const power = dash.modules.find((m) => m.id === "power_tariff");
    const weather = dash.modules.find((m) => m.id === "weather");

    expect(fuel?.status).toBe("unavailable");
    expect(power?.status).toBe("unavailable");
    expect(weather?.status).toBe("ready");
    expect(dash.visibleModules.every((m) => m.status === "ready")).toBe(true);
    expect(dash.visibleModules.some((m) => m.id === "fuel")).toBe(false);
  });

  it("covers matrix districts for resolution default", () => {
    for (const slug of [
      "raipur",
      "durg",
      "rajnandgaon",
      "bilaspur",
      "korba",
      "bastar",
    ]) {
      expect(
        resolveDistrictPreference({
          explicitSlug: slug,
        }).slug
      ).toBe(slug === "bastar" ? "bastar" : slug);
    }
    expect(
      resolveDistrictPreference({ explicitSlug: "jagdalpur" }).slug
    ).toBe("bastar");
  });
});
