/**
 * Phase 7B verification — homepage duplicate metrics
 * Run: npx tsx scripts/phase7b-homepage-verify.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { buildGeneratedHomepageFeed } from "../src/lib/homepage/generated-feed";
import {
  countHomepageDuplicates,
  homepageDiversityScore,
} from "../src/lib/homepage/homepage-composition";
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

function reportFeed(label: string, feed: NonNullable<ReturnType<typeof buildGeneratedHomepageFeed>>) {
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
    heroUnique:
      !feed.breakingTicker.some((a) => a.id === feed.editorsPicks.lead.id) &&
      !feed.trending.some((a) => a.id === feed.editorsPicks.lead.id),
    trendingUnique:
      feed.trending.filter(
        (a) =>
          a.id === feed.editorsPicks.lead.id ||
          feed.breakingTicker.some((b) => b.id === a.id)
      ).length === 0,
    districtUnique:
      feed.regionalHighlights.filter(
        (a) =>
          a.id === feed.editorsPicks.lead.id ||
          feed.trending.some((t) => t.id === a.id)
      ).length === 0,
    reelsOverlap: feed.newsShorts.filter((s) =>
      [
        feed.editorsPicks.lead.id,
        ...feed.breakingTicker.map((a) => a.id),
        ...feed.trending.map((a) => a.id),
      ].includes(s.articleId)
    ).length,
    listenPoolSize: feed.listenArticleIds?.length ?? 0,
    heroHeadline: feed.editorsPicks.lead.headline.slice(0, 60),
  };

  console.log(JSON.stringify(metrics, null, 2));
  return metrics;
}

async function main() {
  const rows = loadSampleRows();
  if (!rows.length) {
    console.log("No feed.json sample — run metrics from unit tests only.");
    process.exit(0);
  }

  const feed = buildGeneratedHomepageFeed(rows, { displayLanguage: "hi" });
  if (!feed) {
    console.error("Failed to build feed");
    process.exit(1);
  }

  reportFeed("after-phase7b", feed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
