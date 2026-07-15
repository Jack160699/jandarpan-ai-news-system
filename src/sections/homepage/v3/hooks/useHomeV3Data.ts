"use client";

import { useMemo } from "react";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import {
  buildDistrictArticlePool,
  filterArticlesByDistrict,
} from "@/lib/homepage/district-filter";
import type { FeaturedDistrictSlug } from "@/lib/homepage/district-filter";
import { buildRecommendedArticles } from "@/lib/personalization/recommendations";
import type { PersonalizationSignals } from "@/lib/personalization/types";
import { safeArticleRanking } from "@/lib/homepage/feed-safety";
import { getDistrict } from "@/lib/regional/districts";
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
    const lead = feed.editorsPicks.lead;
    const supporting = feed.editorsPicks.supporting ?? [];

    const breakingCandidate =
      feed.breakingTicker.find(
        (a) => a.ranking?.isBreaking || a.urgency === "high"
      ) ??
      feed.breakingTicker[0] ??
      null;

    const leadStory = {
      ...(breakingCandidate ?? lead),
      ranking: safeArticleRanking(breakingCandidate ?? lead),
      isBreaking: Boolean(
        breakingCandidate
      ),
    };

    const reserved = new Set([leadStory.id, lead.id]);

    const storyPool = dedupeArticles([
      ...supporting,
      ...feed.trending,
      ...feed.regionalHighlights,
      ...feed.liveWire,
    ]).filter((a) => !reserved.has(a.id));

    const quickScan = storyPool.slice(0, 6);
    const storyFeed = storyPool.slice(6, 14);

    const districtSlug = (signals.homeDistrict ?? "raipur") as FeaturedDistrictSlug;
    const districtMeta = getDistrict(districtSlug);
    const districtPool = buildDistrictArticlePool(feed);
    const districtNews = filterArticlesByDistrict(districtPool, districtSlug).slice(
      0,
      5
    );

    const topDistrictStory = districtNews[0] ?? null;

    const liveUpdates = dedupeArticles([
      ...feed.liveWire,
      ...feed.breakingTicker,
    ])
      .filter((a) => a.id !== leadStory.id)
      .slice(0, 8);

    const recommended = buildRecommendedArticles(feed, signals, 6);
    const trendingFallback = dedupeArticles(feed.trending).slice(0, 6);

    const streamFallback = Array.from(
      storyPool.reduce((groups, article) => {
        const current = groups.get(article.section) ?? [];
        current.push(article);
        groups.set(article.section, current);
        return groups;
      }, new Map<HomeArticle["section"], HomeArticle[]>())
    ).map(([id, articles]) => ({
      id,
      label: articles[0]?.categoryLabel || id,
      labelHi: articles[0]?.categoryLabel || id,
      articles,
    }));

    const categoryStreams = (feed.categoryStreams ?? []).filter(
      (stream) => stream.articles.length > 0
    );
    const editorialStreams = (feed.editorialDesks ?? [])
      .filter((desk) => desk.articles.length > 0)
      .map((desk) => ({
        id: (desk.articles[0]?.section ?? "chhattisgarh") as HomeArticle["section"],
        label: desk.label,
        labelHi: desk.labelHi,
        articles: desk.articles,
      }));

    const hyperlocal = feed.hyperlocalFeeds?.find(
      (h) => h.districtSlug === districtSlug
    );

    const aiInsight = lead.summary ? truncateSummary(lead.summary) : null;

    return {
      feed,
      lead,
      leadStory,
      quickScan,
      storyFeed,
      districtSlug,
      districtName: districtMeta?.name ?? districtSlug,
      districtNameHi: districtMeta?.nameHi ?? districtSlug,
      districtNews,
      topDistrictStory,
      hyperlocal,
      liveUpdates,
      localAlerts: feed.localBreakingAlerts ?? [],
      recommended,
      trendingFallback,
      categoryStreams:
        categoryStreams.length > 0
          ? categoryStreams
          : editorialStreams.length > 0
            ? editorialStreams
            : streamFallback,
      aiInsight,
      listenArticleIds: feed.listenArticleIds ?? [],
      audioShorts: feed.newsShorts ?? [],
    };
  }, [feed, signals]);
}
