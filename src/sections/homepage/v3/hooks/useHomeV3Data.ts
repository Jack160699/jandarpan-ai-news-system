"use client";

import { useMemo } from "react";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { buildDistrictArticlePool, filterArticlesByDistrict } from "@/lib/homepage/district-filter";
import type { FeaturedDistrictSlug } from "@/lib/homepage/district-filter";
import { buildRecommendedArticles } from "@/lib/personalization/recommendations";
import type { PersonalizationSignals } from "@/lib/personalization/types";
import { safeArticleRanking } from "@/lib/homepage/feed-safety";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";
import { useLocalizedFeed } from "@/hooks/useLocalizedFeed";

export type TopStoryTier = "hero" | "featured" | "standard" | "compact";

export type TieredStory = HomeArticle & { tier: TopStoryTier };

function dedupeArticles(articles: HomeArticle[]): HomeArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (!a?.id || seen.has(a.id)) return false;
    seen.add(a.id);
    return Boolean(a.headline?.trim());
  });
}

function assignTiers(articles: HomeArticle[]): TieredStory[] {
  return articles.map((article, index) => {
    let tier: TopStoryTier = "compact";
    if (index === 0) tier = "hero";
    else if (index < 3) tier = "featured";
    else if (index < 6) tier = "standard";
    return { ...article, tier };
  });
}

export function useHomeV3Data(
  initialFeed: GeneratedHomepageFeed,
  signals: PersonalizationSignals
) {
  const { feed: liveFeed } = useLiveNewsroom();
  const localized = useLocalizedFeed(liveFeed);
  const feed = localized ?? liveFeed ?? initialFeed;

  return useMemo(() => {
    const lead = feed.editorsPicks.lead;
    const supporting = feed.editorsPicks.supporting ?? [];

    const breakingCandidate =
      feed.breakingTicker.find((a) => a.ranking?.isBreaking || a.urgency === "high") ??
      feed.breakingTicker[0] ??
      lead;

    const breakingStory = {
      ...breakingCandidate,
      ranking: safeArticleRanking(breakingCandidate),
    };

    const reserved = new Set([breakingStory.id, lead.id]);

    const topPool = dedupeArticles([
      ...supporting,
      ...feed.trending,
      ...feed.regionalHighlights,
    ]).filter((a) => !reserved.has(a.id));

    const topStories = assignTiers(topPool.slice(0, 8));

    const districtSlug = (signals.homeDistrict ?? "raipur") as FeaturedDistrictSlug;
    const districtPool = buildDistrictArticlePool(feed);
    const districtNews = filterArticlesByDistrict(districtPool, districtSlug).slice(0, 6);

    const liveUpdates = dedupeArticles([...feed.liveWire, ...feed.breakingTicker]).slice(0, 10);

    const recommended = buildRecommendedArticles(feed, signals, 6);
    const trendingFallback = dedupeArticles(feed.trending).slice(0, 6);

    const hyperlocal = feed.hyperlocalFeeds?.find(
      (h) => h.districtSlug === districtSlug
    );

    return {
      feed,
      lead,
      breakingStory,
      topStories,
      districtSlug,
      districtNews,
      hyperlocal,
      liveUpdates,
      recommended,
      trendingFallback,
      brief: {
        breakingCount: feed.footerIntelligence?.breakingCount ?? feed.breakingTicker.length,
        storyCount: feed.footerIntelligence?.storyCount ?? 0,
        summary: lead.summary,
        avgConfidence: feed.footerIntelligence?.avgConfidence ?? lead.aiConfidence,
        listenArticleIds: feed.listenArticleIds ?? [],
      },
    };
  }, [feed, signals]);
}
