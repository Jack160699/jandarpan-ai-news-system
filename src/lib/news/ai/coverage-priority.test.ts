import { describe, expect, it } from "vitest";
import { applyCoveragePolicy, classifyEventCoverage, coverageTierScore, isImportantEvent } from "./coverage-priority";
import { selectEditorialCandidates } from "@/lib/infrastructure/workers/editorial-priority";
import type { NewsEventRow } from "@/lib/types/newsroom";

const ev = (id: string, title: string, over: Partial<NewsEventRow> = {}): NewsEventRow => ({
  id,
  canonical_title: title,
  event_summary: over.event_summary ?? null,
  region: "chhattisgarh",
  category: "regional",
  urgency_score: 20,
  source_count: 1,
  signal_ids: [],
  clustering_metadata: {},
  coverage_slug: null,
  coverage_headline: null,
  cluster_confidence: 0.5,
  is_live: false,
  coverage_status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...over,
});

const RAIPUR = "रायपुर में नगर निगम ने सड़क चौड़ीकरण का काम शुरू किया, छत्तीसगढ़ सरकार ने दी मंजूरी";
const DURG = "भिलाई स्टील प्लांट में हादसा, दुर्ग पुलिस ने दर्ज किया मामला, छत्तीसगढ़";
const BASTAR = "बस्तर के सुकमा जिले में नक्सली मुठभेड़, छत्तीसगढ़ पुलिस ने बरामद किया हथियार";
const STATE = "छत्तीसगढ़ सरकार ने मंत्रिमंडल की बैठक में नई योजना को मंजूरी दी";
const NATIONAL = "संसद के शीतकालीन सत्र की तारीखों का ऐलान, केंद्र सरकार ने जारी की अधिसूचना";
const WORLD = "अमेरिका और चीन के बीच व्यापार वार्ता पर संयुक्त राष्ट्र ने जताई चिंता";

describe("classifyEventCoverage", () => {
  it("ranks the four primary districts first (Bhilai counts as Durg)", () => {
    expect(classifyEventCoverage(ev("a", RAIPUR)).rank).toBe(1);
    expect(classifyEventCoverage(ev("b", DURG)).rank).toBe(1);
  });

  it("ranks other CG districts, statewide, national and international in policy order", () => {
    expect(classifyEventCoverage(ev("c", BASTAR)).rank).toBe(3);
    expect(classifyEventCoverage(ev("d", STATE)).rank).toBe(2);
    expect(classifyEventCoverage(ev("e", NATIONAL, { region: "india" })).rank).toBe(4);
    expect(classifyEventCoverage(ev("f", WORLD, { region: "global" })).rank).toBe(5);
  });

  it("importance = corroborated, urgent or live", () => {
    expect(isImportantEvent({ source_count: 1, urgency_score: 10, is_live: false })).toBe(false);
    expect(isImportantEvent({ source_count: 2, urgency_score: 10, is_live: false })).toBe(true);
    expect(isImportantEvent({ source_count: 1, urgency_score: 75, is_live: false })).toBe(true);
    expect(isImportantEvent({ source_count: 1, urgency_score: 10, is_live: true })).toBe(true);
  });
});

describe("applyCoveragePolicy", () => {
  it("keeps every primary-district story but only IMPORTANT stories from the other tiers", () => {
    const events = [
      ev("p1", RAIPUR),
      ev("s-low", STATE),
      ev("s-hi", STATE, { source_count: 3 }),
      ev("o-low", BASTAR),
      ev("o-hi", BASTAR, { urgency_score: 80 }),
      ev("n-low", NATIONAL, { region: "india" }),
      ev("n-hi", NATIONAL, { region: "india", source_count: 4 }),
      ev("w-low", WORLD, { region: "global" }),
    ];
    const { kept, dropped } = applyCoveragePolicy(events);
    expect(kept.map((e) => e.id).sort()).toEqual(["n-hi", "o-hi", "p1", "s-hi"]);
    expect(dropped.not_important).toBe(4);
  });

  it("drops UNKNOWN geography outright", () => {
    const { kept, dropped } = applyCoveragePolicy([ev("u", "एक सामान्य खबर बिना किसी स्थान के उल्लेख के", { region: null })]);
    expect(kept).toHaveLength(0);
    expect(dropped.unknown_geography).toBe(1);
  });
});

describe("slate ordering", () => {
  it("fresh primary-district stories outrank high-urgency national newswire (tier order is strict)", () => {
    const events = [
      ev("national-urgent", NATIONAL, { region: "india", urgency_score: 100, source_count: 6, is_live: true }),
      ev("bastar", BASTAR, { urgency_score: 90, source_count: 3 }),
      ev("state", STATE, { urgency_score: 70, source_count: 2 }),
      ev("raipur-quiet", RAIPUR, { urgency_score: 5 }),
      ev("world", WORLD, { region: "global", urgency_score: 95, source_count: 5 }),
    ];
    const { kept, coverage } = applyCoveragePolicy(events);
    const rank = new Map([...coverage].map(([id, c]) => [id, c.rank]));
    const order = selectEditorialCandidates(kept, kept.length, { coverageRank: rank }).map((e) => e.id);
    expect(order).toEqual(["raipur-quiet", "state", "bastar", "national-urgent", "world"]);
  });

  it("without a coverage map the legacy ordering is unchanged", () => {
    expect(coverageTierScore(undefined)).toBe(0);
    const order = selectEditorialCandidates(
      [ev("low", RAIPUR, { urgency_score: 1 }), ev("high", NATIONAL, { region: "india", urgency_score: 100 })],
      2
    ).map((e) => e.id);
    expect(order[0]).toBe("high");
  });
});
