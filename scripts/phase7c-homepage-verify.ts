/**
 * Phase 7C verification — editorial desk balance metrics
 * Run: npx tsx scripts/phase7c-homepage-verify.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { buildGeneratedHomepageFeed } from "../src/lib/homepage/generated-feed";
import {
  countHomepageDuplicates,
  homepageDiversityScore,
} from "../src/lib/homepage/homepage-composition";
import { classifyEditorialDesk } from "../src/lib/homepage/editorial-desks";
import { balanceDistrictSlug } from "../src/lib/homepage/editorial-desks";
import { maxConsecutiveSame } from "../src/lib/homepage/homepage-desk-metrics";
import type { GeneratedArticleRow } from "../src/lib/types/newsroom";

type SnapshotPayload = {
  snapshot?: {
    breakingTicker?: { id: string; headline: string }[];
    trending?: { id: string; headline: string }[];
    liveWire?: { id: string; headline: string }[];
  };
};

function loadSampleRows(): GeneratedArticleRow[] {
  const feedPath = resolve(process.cwd(), "feed.json");
  try {
    const raw = JSON.parse(readFileSync(feedPath, "utf-8")) as SnapshotPayload;
    const snap = raw.snapshot;
    if (!snap) return [];
    const ids = new Set<string>();
    const rows: GeneratedArticleRow[] = [];

    const pools = [
      ...(snap.breakingTicker ?? []),
      ...(snap.liveWire ?? []),
      ...(snap.trending ?? []),
    ];

    for (const item of pools) {
      if (ids.has(item.id)) continue;
      ids.add(item.id);
      rows.push({
        id: item.id,
        slug: item.id,
        headline: item.headline,
        summary: item.headline,
        article_body: item.headline,
        language: "hi",
        tags: ["local"],
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        editorial_status: "approved",
        editorial_metadata: { ai_confidence: 0.7 },
      } as GeneratedArticleRow);
    }
    return rows;
  } catch {
    return [];
  }
}

function syntheticPool(): GeneratedArticleRow[] {
  const now = new Date().toISOString();
  const headlines = [
    { h: "Raipur cabinet reshuffle politics", tags: ["politics"], section: "raipur" },
    { h: "Bilaspur market economy surge", tags: ["business"], section: "chhattisgarh" },
    { h: "Korba coal plant expansion", tags: ["business"], section: "chhattisgarh" },
    { h: "Durg Bhilai steel output rises", tags: ["business"], section: "chhattisgarh" },
    { h: "Bastar jagdalpur security update", tags: ["local"], section: "chhattisgarh" },
    { h: "Rajnandgaon school exam results", tags: ["education"], section: "chhattisgarh" },
    { h: "Ambikapur health camp opens", tags: ["health"], section: "chhattisgarh" },
    { h: "Raipur murder case arrest", tags: ["crime"], section: "raipur" },
    { h: "Bilaspur police encounter", tags: ["crime"], section: "chhattisgarh" },
    { h: "India parliament session Delhi", tags: ["politics"], section: "india" },
    { h: "World climate summit Geneva", tags: ["world"], section: "world" },
    { h: "Cricket IPL match highlights", tags: ["sports"], section: "sports" },
    { h: "CG volleyball tournament", tags: ["sports"], section: "sports" },
    { h: "Bollywood film release", tags: ["entertainment"], section: "world" },
    { h: "AI smartphone launch tech", tags: ["technology"], section: "business" },
    { h: "Fact check viral claim", tags: ["fact-check"], section: "india" },
    { h: "Opinion column on economy", tags: ["opinion"], section: "india" },
    { h: "Explainer monsoon pattern", tags: ["explainers"], section: "education" },
    { h: "Monsoon weather alert CG", tags: ["weather"], section: "chhattisgarh" },
    { h: "Election nomination filing", tags: ["election"], section: "politics" },
  ];

  return headlines.map((item, i) => ({
    id: `synth-${i}`,
    slug: `synth-${i}`,
    headline: item.h,
    summary: item.h,
    article_body: item.h,
    language: "hi",
    tags: item.tags,
    published_at: now,
    created_at: now,
    editorial_status: "approved",
    editorial_metadata: { ai_confidence: 0.75 },
  })) as GeneratedArticleRow[];
}

function reportFeed(
  label: string,
  feed: NonNullable<ReturnType<typeof buildGeneratedHomepageFeed>>
) {
  const allVisible = [
    feed.editorsPicks.lead,
    ...feed.editorsPicks.supporting,
    ...feed.breakingTicker,
    ...feed.trending,
    ...feed.liveWire,
    ...feed.regionalHighlights,
  ];

  const deskCounts = new Map<string, number>();
  for (const a of allVisible) {
    const desk = classifyEditorialDesk(a);
    deskCounts.set(desk, (deskCounts.get(desk) ?? 0) + 1);
  }

  const maxDeskRun = maxConsecutiveSame(allVisible, (a) => classifyEditorialDesk(a));
  const maxDistrictRun = maxConsecutiveSame(feed.regionalHighlights, (a) =>
    balanceDistrictSlug(a)
  );

  const metrics = {
    label,
    duplicates: countHomepageDuplicates({
      editorsPicks: feed.editorsPicks,
      breakingTicker: feed.breakingTicker,
      trending: feed.trending,
      liveWire: feed.liveWire,
      regionalHighlights: feed.regionalHighlights,
      newsShorts: feed.newsShorts,
    }),
    diversityScore: homepageDiversityScore({
      editorsPicks: feed.editorsPicks,
      breakingTicker: feed.breakingTicker,
      trending: feed.trending,
      liveWire: feed.liveWire,
      regionalHighlights: feed.regionalHighlights,
    }),
    deskQuality: feed.deskQuality,
    editorialDesksFilled: feed.editorialDesks?.filter((d) => d.articles.length > 0).length ?? 0,
    editorialDesksTotal: feed.editorialDesks?.length ?? 0,
    uniqueDesksInVisible: deskCounts.size,
    maxDeskConsecutive: maxDeskRun,
    maxDistrictConsecutive: maxDistrictRun,
    crimeInTrending: feed.trending.filter((a) => classifyEditorialDesk(a) === "crime").length,
    politicsInVisible: [...deskCounts.entries()]
      .filter(([k]) => k === "politics")
      .reduce((s, [, v]) => s + v, 0),
  };

  console.log(JSON.stringify(metrics, null, 2));
  return metrics;
}

const sample = loadSampleRows();
const pool = sample.length ? sample : syntheticPool();
const feed = buildGeneratedHomepageFeed(pool, { displayLanguage: "hi" });

if (!feed) {
  console.error("Failed to build feed");
  process.exit(1);
}

reportFeed("phase7c", feed);
