/**
 * Strict single-language enforcement — no mixed-language fallbacks in UI
 */

import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import {
  resolveLocalizedFieldsStrict,
  type LocalizedArticleFields,
} from "@/lib/i18n/resolve-article";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import { getTrendingSearchesForLanguage } from "@/lib/i18n/trending-searches";

export function isMatchingLanguage(
  sourceLanguage: string | null | undefined,
  selectedLanguage: NewsroomLanguage
): boolean {
  return normalizeArticleLanguage(sourceLanguage) === selectedLanguage;
}

export function articleLocaleReady(
  row: GeneratedArticleRow,
  selectedLanguage: NewsroomLanguage
): boolean {
  return resolveLocalizedFieldsStrict(row, selectedLanguage) !== null;
}

export function filterHomeArticles(articles: HomeArticle[]): HomeArticle[] {
  return articles.filter((a) => a.localeMatch !== false);
}

function filterBlock<T extends { articles?: HomeArticle[] }>(blocks: T[]): T[] {
  return blocks
    .map((b) => ({
      ...b,
      articles: b.articles ? filterHomeArticles(b.articles) : b.articles,
    }))
    .filter((b) => !b.articles || b.articles.length > 0);
}

/** Apply strict locale filter across entire homepage feed snapshot */
export function localizeGeneratedFeed(
  feed: GeneratedHomepageFeed,
  selectedLanguage: NewsroomLanguage
): GeneratedHomepageFeed {
  const breakingTicker = filterHomeArticles(feed.breakingTicker);
  const liveWire = filterHomeArticles(feed.liveWire);
  const regionalHighlights = filterHomeArticles(feed.regionalHighlights);
  const trending = filterHomeArticles(feed.trending);
  const shorts = filterHomeArticles(feed.shorts);

  const lead = feed.editorsPicks.lead.localeMatch !== false
    ? feed.editorsPicks.lead
    : breakingTicker[0] ?? liveWire[0] ?? trending[0] ?? null;

  const supporting = filterHomeArticles(feed.editorsPicks.supporting);

  const editorsPicks =
    lead
      ? {
          lead,
          supporting: supporting.filter((a) => a.id !== lead.id).slice(0, 4),
        }
      : {
          lead: breakingTicker[0] ?? liveWire[0] ?? trending[0] ?? feed.editorsPicks.lead,
          supporting: [],
        };

  const hyperlocalFeeds = feed.hyperlocalFeeds.map((f) => ({
    ...f,
    districtName:
      selectedLanguage === "en" ? f.districtName : f.districtNameHi,
    topHeadline: f.topHeadline,
  }));

  const localBreakingAlerts = feed.localBreakingAlerts.filter((alert) => {
    const match = breakingTicker.some((a) => a.slug === alert.slug);
    return match || alert.headline.length > 0;
  });

  return {
    ...feed,
    breakingTicker: breakingTicker.length
      ? breakingTicker
      : filterHomeArticles([editorsPicks.lead]),
    editorsPicks,
    liveWire,
    regionalHighlights,
    trending,
    shorts,
    categoryStreams: filterBlock(feed.categoryStreams),
    hyperlocalFeeds,
    localBreakingAlerts,
    footerIntelligence: {
      ...feed.footerIntelligence,
      trendingSearches: getTrendingSearchesForLanguage(selectedLanguage),
    },
  };
}

export type { LocalizedArticleFields };
