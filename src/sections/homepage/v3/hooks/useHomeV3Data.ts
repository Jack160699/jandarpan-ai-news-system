"use client";

import { useMemo } from "react";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { buildDistrictArticlePool } from "@/lib/homepage/district-filter";
import { buildRecommendedArticles } from "@/lib/personalization/recommendations";
import type { PersonalizationSignals } from "@/lib/personalization/types";
import { safeArticleRanking } from "@/lib/homepage/feed-safety";
import { getDistrict } from "@/lib/regional/districts";
import {
  composeMeraJila,
  DEFAULT_DISTRICT_SLUG,
  rankDistrictStories,
} from "@/lib/district-intelligence";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";
import { useLocalizedFeed } from "@/hooks/useLocalizedFeed";

function dedupeArticles(articles: HomeArticle[]): HomeArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (!a?.id || seen.has(a.id)) return false;
    seen.add(a.id);
    return Boolean(a.headline?.trim());
  });
}

function truncateSummary(text: string, max = 180): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

export function useHomeV3Data(
  initialFeed: GeneratedHomepageFeed,
  signals: PersonalizationSignals
) {
  const { feed: liveFeed } = useLiveNewsroom();
  const localized = useLocalizedFeed(liveFeed);
  const feed = localized ?? liveFeed ?? initialFeed;

  return useMemo(() => {
    const districtSlug =
      getDistrict(signals.homeDistrict ?? "")?.slug ?? DEFAULT_DISTRICT_SLUG;
    const districtMeta = getDistrict(districtSlug);

    const pool = dedupeArticles([
      feed.editorsPicks.lead,
      ...(feed.editorsPicks.supporting ?? []),
      ...feed.trending,
      ...feed.regionalHighlights,
      ...feed.liveWire,
      ...feed.breakingTicker,
    ]);

    // District-first lead — not global breaking-first
    const leadRanked = rankDistrictStories(pool, districtSlug, { limit: 1 });
    const districtLead = leadRanked.lead;
    const leadBase = districtLead?.article ?? feed.editorsPicks.lead;

    const leadStory = {
      ...leadBase,
      ranking: {
        ...safeArticleRanking(leadBase),
        reasons: [
          ...(safeArticleRanking(leadBase).reasons ?? []),
          ...(districtLead ? [`district_lead:${districtLead.reason}`] : []),
        ],
      },
      isBreaking: Boolean(
        leadBase.ranking?.isBreaking || leadBase.urgency === "high"
      ),
    };

    const lead = feed.editorsPicks.lead;
    const reserved = new Set([leadStory.id, lead.id]);

    const storyPool = dedupeArticles([
      ...(feed.editorsPicks.supporting ?? []),
      ...feed.trending,
      ...feed.regionalHighlights,
      ...feed.liveWire,
    ]).filter((a) => !reserved.has(a.id));

    const quickScan = storyPool.slice(0, 6);
    const storyFeed = storyPool.slice(6, 14);

    const districtPool = buildDistrictArticlePool(feed);
    const meraJila = composeMeraJila(
      dedupeArticles([...districtPool, ...pool]),
      districtSlug
    );

    const districtNews = meraJila.exactStories.map((s) => s.article).slice(0, 5);
    const nearbyNews = meraJila.nearbyStories.map((s) => s.article);
    const topDistrictStory =
      meraJila.lead?.kind === "exact" || meraJila.lead?.kind === "nearby"
        ? meraJila.lead.article
        : meraJila.exactStories[0]?.article ?? null;

    const liveUpdates = dedupeArticles([
      ...feed.liveWire,
      ...feed.breakingTicker,
    ])
      .filter((a) => a.id !== leadStory.id)
      .slice(0, 8);

    const recommended = buildRecommendedArticles(feed, signals, 6);
    const trendingFallback = dedupeArticles(feed.trending).slice(0, 6);

    const hyperlocal = feed.hyperlocalFeeds?.find(
      (h) =>
        h.districtSlug === districtSlug ||
        (districtSlug === "bastar" && h.districtSlug === "jagdalpur")
    );

    const aiInsight = leadStory.summary
      ? truncateSummary(leadStory.summary)
      : null;

    return {
      feed,
      lead,
      leadStory,
      leadReason: districtLead?.reason ?? "state_fallback",
      quickScan,
      storyFeed,
      districtSlug,
      districtName: districtMeta?.name ?? districtSlug,
      districtNameHi: districtMeta?.nameHi ?? districtSlug,
      districtNews,
      nearbyNews,
      meraJila,
      usedNearbyFallback: meraJila.usedNearbyFallback,
      topDistrictStory,
      hyperlocal,
      liveUpdates,
      localAlerts: feed.localBreakingAlerts ?? [],
      recommended,
      trendingFallback,
      aiInsight,
      listenArticleIds: feed.listenArticleIds ?? [],
    };
  }, [feed, signals]);
}
