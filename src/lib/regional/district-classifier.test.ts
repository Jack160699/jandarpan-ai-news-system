import { describe, expect, it } from "vitest";
import { classifyDistrictContent } from "@/lib/regional/district-classifier";
import { tagGeoFromContent } from "@/lib/regional/geo-tagging";

describe("district-classifier", () => {
  it("does not turn a Delhi national story into CG from feed hints", () => {
    const result = classifyDistrictContent({
      title: "राहुल गांधी ने दिल्ली के जंतर मंतर पर छात्रों को संबोधित किया",
      body: "संसद में राष्ट्रीय परीक्षा नीति पर चर्चा की मांग की गई।",
      region: "chhattisgarh",
      category: "local",
    });
    expect(result.kind).toBe("non_cg");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("keeps feed-only CG hints unproven", () => {
    const result = classifyDistrictContent({
      title: "नागरिक सेवा पर नया अपडेट",
      body: "विभाग ने प्रक्रिया की जानकारी दी।",
      region: "chhattisgarh",
      category: "local",
    });
    expect(result.kind).toBe("unknown");
  });

  it("treats secretariat / cabinet / vidhan sabha as statewide — not Raipur", () => {
    const cases = [
      "Chhattisgarh cabinet clears new education policy at secretariat",
      "Vidhan Sabha session begins in Chhattisgarh",
      "छत्तीसगढ़ मंत्रालय में बैठक",
    ];

    for (const title of cases) {
      const c = classifyDistrictContent({ title });
      expect(c.kind).toBe("statewide");
      expect(c.districtSlug).toBeUndefined();

      const geo = tagGeoFromContent({ title });
      expect(geo.is_chhattisgarh).toBe(true);
      expect(geo.state).toBe("chhattisgarh");
      expect(geo.primary_district).toBeNull();
    }
  });

  it("does not treat a generic chief-minister reference as CG proof", () => {
    const result = classifyDistrictContent({
      title: "Chief Minister announces statewide flood relief",
      region: "chhattisgarh",
      category: "local",
    });
    expect(result.kind).toBe("unknown");
  });

  it("assigns Raipur only when Raipur is explicitly mentioned", () => {
    const c = classifyDistrictContent({
      title: "Raipur collector reviews monsoon prep in रायपुर",
    });
    expect(c.kind).toBe("district");
    expect(c.districtSlug).toBe("raipur");
    expect(c.confidence).toBeGreaterThanOrEqual(0.65);

    const geo = tagGeoFromContent({
      title: "Raipur collector reviews monsoon prep",
    });
    expect(geo.primary_district).toBe("raipur");
  });

  it("never forces Raipur from capital / state-govt-only weak alias", () => {
    const c = classifyDistrictContent({
      title: "State government reviews capital infrastructure plan in Chhattisgarh",
    });
    expect(c.kind).not.toBe("district");
    expect(c.districtSlug).not.toBe("raipur");

    const geo = tagGeoFromContent({
      title: "State government reviews capital infrastructure plan in Chhattisgarh",
    });
    expect(geo.primary_district).toBeNull();
  });

  it("flags multi_district when ≥2 strong matches", () => {
    const c = classifyDistrictContent({
      title: "Durg and Bilaspur districts declare holiday for local festival",
    });
    expect(c.kind).toBe("multi_district");
    expect(c.ambiguity).toBe(true);
    expect(c.alternatives.length).toBeGreaterThanOrEqual(2);

    const geo = tagGeoFromContent({
      title: "Durg and Bilaspur districts declare holiday for local festival",
    });
    expect(geo.districts.length).toBeGreaterThanOrEqual(2);
  });

  it("matches Hindi district aliases", () => {
    const c = classifyDistrictContent({
      title: "कोरबा में बिजली संयंत्र का निरीक्षण",
    });
    expect(c.kind).toBe("district");
    expect(c.districtSlug).toBe("korba");
    expect(c.matchedTerms.some((t) => /कोरबा|korba/i.test(t))).toBe(true);
  });
});
