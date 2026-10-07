import { describe, expect, it } from "vitest";
import { detectRiskFlags, hasBlockingRisk, needsModeratorDecision } from "@/lib/user-news/risk-flags";
import { canPublishAsDistrict, resolveSubmissionGeo, toGeoMetadata } from "@/lib/user-news/submission-geo";
import { selectFeedRows } from "@/lib/feed/feed-selector";

const codes = (text: string, extra: Parameters<typeof detectRiskFlags>[0] extends infer T ? Partial<T> : never = {}) =>
  detectRiskFlags({ text, ...extra }).map((f) => `${f.code}:${f.severity}`);

describe("risk flags: personal data and explicit content block submission", () => {
  it.each([
    ["Contact him on 9876543210 for details", "personal_data_exposure"],
    ["Call +91 98765 43210 now", "personal_data_exposure"],
    ["Write to ramesh.kumar@example.com", "personal_data_exposure"],
    ["His id is 1234 5678 9012", "personal_data_exposure"],
    ["PAN ABCDE1234F was used", "personal_data_exposure"],
  ])("blocks %j", (text, code) => {
    const flags = detectRiskFlags({ text });
    expect(flags.some((f) => f.code === code && f.severity === "block")).toBe(true);
    expect(hasBlockingRisk(flags)).toBe(true);
  });

  it("blocks explicit sexual content", () => {
    expect(codes("a nude video is circulating")).toContain("sexual_content:block");
  });

  it("does not flag an ordinary local report", () => {
    expect(detectRiskFlags({ text: "रायपुर के शंकर नगर चौक पर आज सुबह दो बाइक की टक्कर हुई। तीन लोग घायल हुए।" })).toEqual([]);
  });
});

describe("risk flags: accusations about identifiable people", () => {
  it("flags a named person stated to have committed a crime as fact", () => {
    const flags = detectRiskFlags({ text: "Ramesh Sahu committed fraud and stole money from the village fund." });
    expect(flags.map((f) => f.code)).toEqual(expect.arrayContaining(["harmful_accusation", "defamatory_claim"]));
    expect(needsModeratorDecision(flags)).toBe(true);
  });

  it("flags the same in Hindi", () => {
    expect(detectRiskFlags({ text: "रमेश साहू ने चोरी की और गांव का पैसा खा गया।" }).map((f) => f.code)).toContain("harmful_accusation");
  });

  it("does NOT flag when it is attributed or hedged", () => {
    expect(detectRiskFlags({ text: "Police said Ramesh Sahu is accused of fraud in the village fund case." }).map((f) => f.code)).not.toContain("harmful_accusation");
    expect(detectRiskFlags({ text: "रमेश साहू पर चोरी का आरोप है, पुलिस जांच कर रही है।" }).map((f) => f.code)).not.toContain("harmful_accusation");
  });
});

describe("risk flags: misinformation, spam, duplicates, media", () => {
  it("flags unverifiable and forwarded claims for review", () => {
    expect(codes("एक वायरल मैसेज में कहा जा रहा है कि कल शहर बंद रहेगा")).toContain("unverifiable_claim:review");
  });

  it("flags miracle-cure style misinformation", () => {
    expect(codes("This miracle cure has 100% guaranteed results")).toContain("misinformation_risk:review");
  });

  it("flags links and promotion as spam, and heavy repetition", () => {
    expect(codes("Visit http://a.example and http://b.example now")).toContain("spam:review");
    expect(codes("call now for a limited offer")).toContain("spam:review");
    expect(codes(Array.from({ length: 30 }, () => "bakwas").join(" "))).toContain("spam:review");
  });

  it("flags a story that duplicates a recent headline", () => {
    const flags = detectRiskFlags({
      text: "body",
      headline: "Five injured in Raipur road accident near Shankar Nagar",
      recentHeadlines: ["Five injured in Raipur road accident near Shankar Nagar chowk"],
    });
    expect(flags.map((f) => f.code)).toContain("duplicate");
  });

  it("passes through media and copyright issues from the pipeline for the moderator", () => {
    const flags = detectRiskFlags({ text: "ok", mediaIssues: ["image appears edited"], copiedFrom: ["example.com"] });
    expect(flags.map((f) => f.code)).toEqual(expect.arrayContaining(["manipulated_media", "copyright_problem"]));
  });

  it("every flag carries the evidence that triggered it", () => {
    for (const f of detectRiskFlags({ text: "Mail me at a@b.co or call 9876543210. Viral message says rumour." })) {
      expect(f.evidence.length).toBeGreaterThan(0);
    }
  });
});

describe("submission geography: only evidence makes a story district-specific", () => {
  it("a declared district that the text supports is confirmed by the text", () => {
    const geo = resolveSubmissionGeo({
      headline: "रायपुर के शंकर नगर में सड़क हादसा",
      body: "रायपुर शहर के शंकर नगर चौक पर आज सुबह दो बाइक की टक्कर हुई।",
      declaredDistrict: "raipur",
    });
    expect(geo.scope).toBe("DISTRICT_SPECIFIC");
    expect(geo.districtSlug).toBe("raipur");
    expect(geo.declaredDistrictStatus).toBe("confirmed_by_text");
    expect(canPublishAsDistrict(geo)).toBe(true);
  });

  it("a district the author only TYPED, with nothing in the text, is NOT promoted to a district story", () => {
    const geo = resolveSubmissionGeo({ headline: "सड़क पर हादसा", body: "आज सुबह चौक पर दो बाइक की टक्कर हुई।", declaredDistrict: "korba" });
    expect(geo.districtSlug).toBeNull();
    expect(geo.declaredDistrict).toBe("korba");
    expect(geo.declaredDistrictStatus).toBe("unverified");
    expect(canPublishAsDistrict(geo)).toBe(false);
  });

  it("a declared district that contradicts what the text names is a conflict, and never publishes as a district story", () => {
    const geo = resolveSubmissionGeo({
      headline: "दुर्ग में सड़क हादसा",
      body: "दुर्ग शहर के बस स्टैंड के पास आज सुबह दो बाइक की टक्कर हुई।",
      declaredDistrict: "raipur",
    });
    expect(geo.declaredDistrictStatus).toBe("conflicts_with_text");
    expect(geo.districtSlug).toBe("durg"); // the evidence wins over the form field
    expect(canPublishAsDistrict(geo)).toBe(false);
  });

  it("a moderator can confirm the declared district", () => {
    const geo = resolveSubmissionGeo({
      headline: "सड़क पर हादसा",
      body: "आज सुबह चौक पर दो बाइक की टक्कर हुई।",
      declaredDistrict: "korba",
      moderatorConfirmedDistrict: "korba",
    });
    expect(geo.declaredDistrictStatus).toBe("confirmed_by_moderator");
    expect(geo.districtSlug).toBe("korba");
    expect(canPublishAsDistrict(geo)).toBe(true);
  });

  it("an unrecognised district is ignored, never invented", () => {
    const geo = resolveSubmissionGeo({ headline: "हादसा", body: "टक्कर", declaredDistrict: "atlantis" });
    expect(geo.declaredDistrict).toBeNull();
    expect(geo.reasons).toContain("declared_district_not_recognised");
  });

  it("text with no geographic evidence at all is UNKNOWN and therefore not publishable", () => {
    const geo = resolveSubmissionGeo({ headline: "Local man wins lottery", body: "A man won money." });
    expect(geo.scope).toBe("UNKNOWN");
    expect(geo.publishable).toBe(false);
  });
});

describe("a published user story appears in exactly the same feeds as any other story", () => {
  const NOW = new Date("2026-10-07T12:00:00.000Z");
  const row = (headline: string, body: string, declared: string | null) => {
    const geo = resolveSubmissionGeo({ headline, body, declaredDistrict: declared });
    return {
      id: "u1",
      slug: "user-story",
      headline,
      published_at: new Date(NOW.getTime() - 3_600_000).toISOString(),
      editorial_status: "approved",
      geo_metadata: toGeoMetadata(geo, NOW),
    };
  };

  it("a proven-district story shows on that district's page", () => {
    const r = row("रायपुर के शंकर नगर में सड़क हादसा", "रायपुर शहर के शंकर नगर चौक पर टक्कर हुई।", "raipur");
    expect(selectFeedRows([r], { feed: "district", districtSlug: "raipur", now: NOW }).rows).toHaveLength(1);
    expect(selectFeedRows([r], { feed: "district", districtSlug: "durg", now: NOW }).rows).toHaveLength(0);
  });

  it("an unproven declared district never reaches any district page", () => {
    const r = row("सड़क पर हादसा", "आज सुबह चौक पर टक्कर हुई।", "korba");
    expect(selectFeedRows([r], { feed: "district", districtSlug: "korba", now: NOW }).rows).toHaveLength(0);
  });

  it("an UNKNOWN-geography user story is excluded from every public timeline", () => {
    const r = row("Local man wins lottery", "A man won money.", null);
    expect(selectFeedRows([r], { feed: "public_all", now: NOW }).rows).toHaveLength(0);
  });
});
