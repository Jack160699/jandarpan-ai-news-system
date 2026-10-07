import { describe, expect, it } from "vitest";
import {
  auditHeadlines,
  headlineSimilarity,
  isGenericHeadline,
  isHeadlineFitForPublicFeed,
} from "@/lib/news/quality/headline-quality";

describe("Hindi / English boilerplate that previously slipped through", () => {
  it.each([
    "प्रादेशिक समाचार अपडेट", // the exact placeholder the Live route used to emit
    "प्रादेशिक समाचार",
    "क्षेत्रीय समाचार अपडेट",
    "राज्य समाचार",
    "जिला समाचार",
    "देश समाचार",
    "Regional News Update",
    "Latest News Update",
    "Breaking News Update",
    "Latest Regional Update",
    "Breaking National News",
    "ताज़ा क्षेत्रीय समाचार",
  ])("treats %j as generic", (h) => {
    expect(isGenericHeadline(h)).toBe(true);
    expect(isHeadlineFitForPublicFeed(h)).toBe(false);
  });

  it.each([
    "रायपुर में सड़क हादसा, पांच घायल",
    "Five injured in Raipur road accident",
    "राज्य सरकार ने धान खरीदी की तारीख बढ़ाई",
    "Chhattisgarh cabinet approves paddy procurement extension",
  ])("keeps the specific headline %j", (h) => {
    expect(isHeadlineFitForPublicFeed(h)).toBe(true);
  });
});

describe("headline audit", () => {
  const items = [
    { id: "1", headline: "Raipur man arrested for ATM fraud", eventId: "e1" },
    { id: "2", headline: "Raipur man arrested for ATM fraud", eventId: "e2" }, // exact duplicate, different event
    { id: "3", headline: "रायपुर में एटीएम ठगी का आरोपी गिरफ्तार", eventId: "e1" },
    { id: "4", headline: "Regional News Update", eventId: "e4" },
    { id: "5", headline: "Raipur man arrested over ATM fraud case", eventId: "e5" }, // near duplicate of 1/2, different event
    { id: "6", headline: "Bilaspur High Court hears paddy procurement petition", eventId: "e6" },
  ];

  it("flags generic headlines", () => {
    expect(auditHeadlines(items).generic.map((g) => g.id)).toEqual(["4"]);
  });

  it("flags exact duplicates only across different events (same-event translations are legitimate)", () => {
    const report = auditHeadlines(items);
    expect(report.exactDuplicates).toHaveLength(1);
    expect(report.exactDuplicates[0]!.ids.sort()).toEqual(["1", "2"]);
    const sameEvent = auditHeadlines([
      { id: "a", headline: "Raipur man arrested for ATM fraud", eventId: "e1" },
      { id: "b", headline: "Raipur man arrested for ATM fraud", eventId: "e1" },
    ]);
    expect(sameEvent.exactDuplicates).toEqual([]);
  });

  it("flags near duplicates across different events but not same-event pairs", () => {
    const report = auditHeadlines(items, { nearDuplicateThreshold: 0.6 });
    const pairs = report.nearDuplicates.map((p) => [p.a.id, p.b.id].sort().join("-"));
    expect(pairs).toContain("1-5");
    expect(pairs).not.toContain("1-3");
  });

  it("flags a repetitive generated opening", () => {
    const templated = Array.from({ length: 5 }, (_, i) => ({
      id: `t${i}`,
      headline: `Authorities announce new measures in district number ${i} today`,
      eventId: `e${i}`,
    }));
    const report = auditHeadlines(templated, { openingMinCount: 4 });
    expect(report.repetitiveOpenings[0]).toMatchObject({ opening: "authorities announce new", count: 5 });
  });

  it("similarity is symmetric and bounded", () => {
    const a = "Raipur man arrested for ATM fraud";
    const b = "Raipur man arrested over ATM fraud case";
    expect(headlineSimilarity(a, b)).toBe(headlineSimilarity(b, a));
    expect(headlineSimilarity(a, a)).toBe(1);
    expect(headlineSimilarity(a, "Cricket final tonight")).toBe(0);
  });
});
