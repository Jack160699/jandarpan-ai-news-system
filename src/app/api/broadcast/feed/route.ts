import { NextRequest, NextResponse } from "next/server";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import type { HomeArticle } from "@/lib/homepage/types";
import type { BroadcastSegment } from "@/features/jd-live/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CG_SECTIONS = new Set(["chhattisgarh", "raipur"]);

/** Map a HomeArticle → BroadcastSegment */
function toSegment(a: HomeArticle): BroadcastSegment {
  return {
    id: a.id,
    slug: a.slug,
    headline: a.headline,
    headlineHi: a.language === "hi" ? a.headline : undefined,
    summary: a.summary,
    summaryHi: a.language === "hi" ? a.summary : undefined,
    imageUrl: a.imageUrl || a.ogImageUrl || "",
    categoryLabel: a.categoryLabel || a.desk?.name || a.section,
    categoryLabelHi: a.desk?.nameHi || undefined,
    district: a.tags?.find((t) => t.startsWith("district:"))?.replace("district:", "") ?? null,
    districtHi: null,
    section: a.section,
    isBreaking: a.ranking?.isBreaking ?? false,
    isLive: a.isLive,
    priorityScore: a.priorityScore ?? a.trendScore ?? 0,
    publishedAt: a.publishedAt,
  };
}

/**
 * Editorial broadcast priority:
 *  1. Breaking
 *  2. Local CG (chhattisgarh, raipur sections, district tags)
 *  3. National India
 *  4. Everything else
 */
function rankSegments(articles: HomeArticle[]): {
  queue: BroadcastSegment[];
  breaking: BroadcastSegment[];
} {
  const breakingArticles = articles.filter((a) => a.ranking?.isBreaking);
  const cgArticles = articles.filter(
    (a) => !a.ranking?.isBreaking && CG_SECTIONS.has(a.section)
  );
  const indiaArticles = articles.filter(
    (a) => !a.ranking?.isBreaking && !CG_SECTIONS.has(a.section) && a.section === "india"
  );
  const restArticles = articles.filter(
    (a) =>
      !a.ranking?.isBreaking &&
      !CG_SECTIONS.has(a.section) &&
      a.section !== "india"
  );

  const orderedQueue = [
    ...cgArticles.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)),
    ...indiaArticles.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)),
    ...restArticles.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)),
  ].slice(0, 10);

  return {
    queue: orderedQueue.map(toSegment),
    breaking: breakingArticles.slice(0, 3).map(toSegment),
  };
}

export async function GET(_req: NextRequest) {
  try {
    const feed = await getCachedGeneratedHomepageFeed();
    if (!feed) {
      return NextResponse.json({ queue: [], breaking: [] });
    }

    const allArticles = [
      ...feed.breakingTicker,
      ...feed.liveWire,
      ...(feed.editorsPicks ? [feed.editorsPicks.lead, ...feed.editorsPicks.supporting] : []),
      ...feed.regionalHighlights,
      ...feed.trending,
    ];

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = allArticles.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    const result = rankSegments(unique);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json({ queue: [], breaking: [] }, { status: 500 });
  }
}
