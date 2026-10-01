import { describe, expect, it } from "vitest";
import {
  belongsToDistrictFeed,
  capIndiaRelevantShare,
  classifyGeoScope,
  isPublishableScope,
  isScopeAllowedInFeed,
  readStoredGeoScope,
  type GeoScope,
} from "@/lib/news/geo/geo-scope";

const scopeOf = (title: string, extra: Partial<Parameters<typeof classifyGeoScope>[0]> = {}) =>
  classifyGeoScope({ title, ...extra });

describe("classifyGeoScope", () => {
  it("classifies a named district as DISTRICT_SPECIFIC and sets that district only", () => {
    const r = scopeOf("Raipur नगर निगम ने नई सड़क का उद्घाटन किया");
    expect(r.scope).toBe("DISTRICT_SPECIFIC");
    expect(r.districtSlug).toBe("raipur");
  });

  it("classifies state-level copy as STATEWIDE_CHHATTISGARH without inventing a district", () => {
    const r = scopeOf("छत्तीसगढ़ सरकार की कैबिनेट बैठक में बड़े फैसले");
    expect(r.scope).toBe("STATEWIDE_CHHATTISGARH");
    expect(r.districtSlug).toBeNull();
  });

  it("classifies a national story with explicit Chhattisgarh involvement as INDIA_RELEVANT", () => {
    const r = scopeOf("Chhattisgarh MPs raise Bastar demand in Lok Sabha during budget debate");
    expect(["INDIA_RELEVANT_TO_CHHATTISGARH", "DISTRICT_SPECIFIC"]).toContain(r.scope);
    expect(r.scope).not.toBe("NATIONAL");
  });

  it("classifies pure national and pure international stories", () => {
    expect(scopeOf("RBI keeps repo rate unchanged; Sensex rallies").scope).toBe("NATIONAL");
    expect(scopeOf("Supreme Court hears plea on Delhi pollution").scope).toBe("NATIONAL");
    expect(scopeOf("Trump announces new tariffs on China as Beijing responds").scope).toBe("INTERNATIONAL");
    expect(scopeOf("यूक्रेन में रूस का बड़ा हमला, संयुक्त राष्ट्र ने जताई चिंता").scope).toBe("INTERNATIONAL");
  });

  it("does not treat a same-named place in another state as a Chhattisgarh district", () => {
    const r = scopeOf("Bilaspur Himachal Pradesh landslide blocks highway, Shimla admin on alert");
    expect(r.scope).not.toBe("DISTRICT_SPECIFIC");
    expect(r.districtSlug).toBeNull();
  });

  it("returns UNKNOWN (quarantine) when there is no geographic evidence", () => {
    const r = scopeOf("Local man wins lottery worth one crore");
    expect(r.scope).toBe("UNKNOWN");
    expect(isPublishableScope(r.scope)).toBe(false);
  });

  it("does not turn a weak feed region hint into a district", () => {
    const r = scopeOf("Farmers protest over crop prices", { region: "chhattisgarh" });
    expect(r.scope).toBe("UNKNOWN");
    expect(r.districtSlug).toBeNull();
  });

  it("upgrades no-evidence copy from a Chhattisgarh-only publisher to statewide, never district", () => {
    const r = scopeOf("Farmers protest over crop prices", { source: "rss:ibc24-cg-direct" });
    expect(r.scope).toBe("STATEWIDE_CHHATTISGARH");
    expect(r.districtSlug).toBeNull();
    expect(r.confidence).toBeLessThan(0.65);
  });

  it("does not trust a Google-News search feed as place evidence", () => {
    const r = scopeOf("Farmers protest over crop prices", { source: "rss:gnews-cg-raipur", region: "chhattisgarh" });
    expect(r.scope).toBe("UNKNOWN");
  });
});

describe("feed policy", () => {
  const all: GeoScope[] = [
    "DISTRICT_SPECIFIC",
    "STATEWIDE_CHHATTISGARH",
    "INDIA_RELEVANT_TO_CHHATTISGARH",
    "NATIONAL",
    "INTERNATIONAL",
    "UNKNOWN",
  ];
  const allowed = (feed: Parameters<typeof isScopeAllowedInFeed>[1]) =>
    all.filter((s) => isScopeAllowedInFeed(s, feed));

  it("district feeds admit only DISTRICT_SPECIFIC", () => {
    expect(allowed("district")).toEqual(["DISTRICT_SPECIFIC"]);
  });
  it("statewide feed admits district + statewide only", () => {
    expect(allowed("statewide")).toEqual(["DISTRICT_SPECIFIC", "STATEWIDE_CHHATTISGARH"]);
  });
  it("CG home never admits national/international/unknown", () => {
    expect(allowed("cg_home")).toEqual([
      "DISTRICT_SPECIFIC",
      "STATEWIDE_CHHATTISGARH",
      "INDIA_RELEVANT_TO_CHHATTISGARH",
    ]);
  });
  it("belongsToDistrictFeed requires matching district evidence", () => {
    const geo = { scope: "DISTRICT_SPECIFIC" as const, districtSlug: "raipur", districts: ["raipur", "durg"] };
    expect(belongsToDistrictFeed(geo, "raipur")).toBe(true);
    expect(belongsToDistrictFeed(geo, "durg")).toBe(true);
    expect(belongsToDistrictFeed(geo, "korba")).toBe(false);
    expect(belongsToDistrictFeed({ scope: "STATEWIDE_CHHATTISGARH", districtSlug: null, districts: [] }, "raipur")).toBe(false);
    expect(belongsToDistrictFeed({ scope: "NATIONAL", districtSlug: null, districts: [] }, "raipur")).toBe(false);
  });
  it("readStoredGeoScope ignores junk", () => {
    expect(readStoredGeoScope({ scope: "NATIONAL" })).toBe("NATIONAL");
    expect(readStoredGeoScope({ scope: "banana" })).toBeNull();
    expect(readStoredGeoScope(null)).toBeNull();
  });
  it("capIndiaRelevantShare limits the controlled share", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      scope: (i % 2 === 0 ? "INDIA_RELEVANT_TO_CHHATTISGARH" : "DISTRICT_SPECIFIC") as GeoScope,
    }));
    const capped = capIndiaRelevantShare(items, 0.2);
    const share = capped.filter((i) => i.scope === "INDIA_RELEVANT_TO_CHHATTISGARH").length / capped.length;
    expect(share).toBeLessThanOrEqual(0.25);
    expect(capped.filter((i) => i.scope === "DISTRICT_SPECIFIC")).toHaveLength(10);
  });
});
