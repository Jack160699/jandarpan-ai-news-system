import { describe, expect, it } from "vitest";
import { evaluatePublicationGates, gateAuditPayload } from "@/lib/news/quality/publication-gates";

const goodHi = {
  language: "hi" as const,
  headline: "रायपुर के पंडरी इलाके में होर्डिंग पोल से लटका मिला युवक का शव",
  summary: "रायपुर पुलिस ने पंडरी क्षेत्र में एक युवक का शव बरामद किया है।",
  body: "रायपुर के पंडरी इलाके में गुरुवार सुबह पुलिस ने एक युवक का शव होर्डिंग पोल से लटका हुआ बरामद किया। पुलिस मामले की जांच कर रही है।",
  sourceTitle: "पंडरी में युवक का शव मिला",
  sourceText: "रायपुर पुलिस ने बताया कि पंडरी थाना क्षेत्र में शव मिला।",
};

describe("evaluatePublicationGates", () => {
  it("passes a specific Hindi district story and records the district from evidence", () => {
    const r = evaluatePublicationGates(goodHi);
    expect(r.passed).toBe(true);
    expect(r.geo.scope).toBe("DISTRICT_SPECIFIC");
    expect(r.geo.districtSlug).toBe("raipur");
    expect(r.blocksAutoPublish).toBe(false);
  });

  it("rejects a Hindi headline labelled English (the production defect)", () => {
    const r = evaluatePublicationGates({ ...goodHi, language: "en" });
    expect(r.mustReject).toBe(true);
    expect(r.failures.map((f) => f.code)).toContain("script_mismatch:devanagari_in_en_headline");
  });

  it("rejects a generic headline", () => {
    const r = evaluatePublicationGates({ ...goodHi, language: "en", headline: "Regional News Update", summary: "Rain in Raipur", body: "Rain fell in Raipur today across the city." });
    expect(r.mustReject).toBe(true);
    expect(r.failures.map((f) => f.code)).toContain("headline:generic_boilerplate");
  });

  it("quarantines (does not reject) an otherwise valid story with unknown geography", () => {
    const r = evaluatePublicationGates({
      language: "en",
      headline: "Local shopkeeper wins one crore rupees in festival lottery draw",
      summary: "A shopkeeper won the top prize in the festival lottery.",
      body: "A shopkeeper won the top prize in the festival lottery draw held on Thursday evening.",
      sourceTitle: "Shopkeeper wins lottery",
      sourceText: "The winner said he would repay debts.",
    });
    expect(r.geo.scope).toBe("UNKNOWN");
    expect(r.mustReject).toBe(false);
    expect(r.blocksAutoPublish).toBe(true);
    expect(r.failures.map((f) => f.code)).toEqual(["geo:unknown_scope"]);
  });

  it("does not let national news become a district story", () => {
    const r = evaluatePublicationGates({
      language: "en",
      headline: "Supreme Court reserves verdict on Delhi pollution petition after long hearing",
      summary: "The Supreme Court reserved its verdict.",
      body: "The Supreme Court on Thursday reserved its verdict on a petition over Delhi pollution.",
      sourceTitle: "Supreme Court reserves verdict on Delhi pollution",
      sourceText: "New Delhi: the bench heard arguments.",
    });
    expect(r.geo.scope).toBe("NATIONAL");
    expect(r.geo.districtSlug).toBeNull();
    expect(r.passed).toBe(true);
  });

  it("produces a compact audit payload", () => {
    const p = gateAuditPayload(evaluatePublicationGates(goodHi));
    expect(p.geo_scope).toBe("DISTRICT_SPECIFIC");
    expect(p.passed).toBe(true);
  });
});
