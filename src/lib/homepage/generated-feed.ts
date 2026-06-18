/**
 * AI-ranked homepage feed — 8-section newsroom layout
 */

import {
  computeHomepagePriorityScore,
  rankArticlesForHomepage,
} from "@/lib/news/ai/ranking";
import {
  buildHyperlocalFeedBundle,
  buildLocalBreakingAlerts,
} from "@/lib/regional";
import type { RankingPersonalization } from "@/lib/news/ai/ranking";
import { buildOpenGraphImageUrl, optimizeCdnImageUrl } from "@/lib/news/ai/editorial-image-compress";
import { resolveFallbackImage } from "@/lib/news/images/fallbacks";
import { isDisplayableImage } from "@/lib/news/images/validate";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import {
  resolveLocalizedFieldsStrict,
} from "@/lib/i18n/resolve-article";
import { homeDebug } from "@/lib/homepage/feed-safety";
import { getTrendingSearchesForLanguage } from "@/lib/i18n/trending-searches";
import {
  normalizeArticleLanguage,
  readingTimeLabel,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { getSectionLabel } from "@/lib/i18n/section-labels";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { resolveEditorialDesk } from "@/lib/newsroom/desk-branding";
import type {
  EditorsPicksBlock,
  GeneratedHomepageFeed,
  HomeArticle,
  HomeSectionId,
  HomeUrgency,
  RegionalSectionBlock,
} from "@/lib/homepage/types";

const LIVE_WINDOW_HOURS = 8;
const HIGH_URGENCY_HOURS = 3;

import { inferSection, REGIONAL_SECTIONS } from "@/lib/homepage/infer-section";

export { inferSection, REGIONAL_SECTIONS };

function hoursSince(iso: string | null): number {
  if (!iso) return 72;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function resolveImageUrls(row: GeneratedArticleRow): { hero: string; og: string } {
  const meta = row.editorial_metadata?.image;
  const heroRaw =
    row.hero_image_url || meta?.og_url || meta?.hero_url || null;

  const category = row.tags[0] ?? "world";
  const hero =
    heroRaw && isDisplayableImage(heroRaw)
      ? optimizeCdnImageUrl(heroRaw, 1200)
      : optimizeCdnImageUrl(resolveFallbackImage({ category }), 1200);

  const og = meta?.og_url
    ? optimizeCdnImageUrl(meta.og_url, 1200)
    : buildOpenGraphImageUrl(hero);

  return { hero, og };
}

function computeUrgency(hours: number, confidence: number): HomeUrgency {
  if (hours <= HIGH_URGENCY_HOURS || confidence >= 0.85) return "high";
  if (hours <= 12) return "medium";
  return "low";
}

export function computeTrendScore(row: GeneratedArticleRow): number {
  const section = inferSection(row);
  return computeHomepagePriorityScore(row, section).score;
}

export function toHomeArticle(
  row: GeneratedArticleRow,
  ranked?: {
    priorityScore: number;
    reasons: string[];
    isTrending: boolean;
    isBreaking: boolean;
    duplicateClusterId: string | null;
    section?: HomeSectionId;
  },
  displayLanguage: NewsroomLanguage = "hi"
): HomeArticle | null {
  const localized = resolveLocalizedFieldsStrict(row, displayLanguage);
  if (!localized?.headline?.trim()) return null;

  const { hero, og } = resolveImageUrls(row);
  const hours = hoursSince(row.published_at);
  const meta = row.editorial_metadata ?? {};
  const confidence = meta.ai_confidence ?? 0.55;
  const publishedAt = row.published_at ?? row.created_at;
  const section = ranked?.section ?? inferSection(row);
  const priorityScore = ranked?.priorityScore ?? 0;
  const dict = getDictionary(displayLanguage);
  const readMins = parseInt(localized.readingTime ?? row.reading_time ?? "3", 10) || 3;
  const attributionCount = Array.isArray(meta.source_attribution)
    ? meta.source_attribution.length
    : 0;
  const sourceCount = (meta.source_count ?? attributionCount) || 1;

  return {
    id: row.id,
    slug: row.slug,
    headline: localized.headline,
    summary: localized.summary?.trim() || localized.seoDescription?.trim() || "",
    imageUrl: hero,
    ogImageUrl: og,
    section,
    readingTime: readingTimeLabel(readMins, displayLanguage),
    publishedAt,
    isLive: hours <= LIVE_WINDOW_HOURS,
    urgency: computeUrgency(hours, confidence),
    trendScore: priorityScore,
    priorityScore,
    ranking: {
      priorityScore,
      reasons: ranked?.reasons ?? [],
      isTrending: ranked?.isTrending ?? false,
      isBreaking: ranked?.isBreaking ?? false,
      duplicateClusterId: ranked?.duplicateClusterId ?? null,
    },
    language: localized.language,
    tags: row.tags ?? [],
    aiConfidence: confidence,
    sourceCount: Math.max(1, sourceCount),
    categoryLabel: getSectionLabel(section, dict, displayLanguage),
    desk: resolveEditorialDesk(
      section,
      section === "chhattisgarh" || section === "raipur"
    ),
  };
}

function pickCategoryStreams(
  ranked: HomeArticle[],
  usedIds: Set<string>,
  displayLanguage: NewsroomLanguage,
  perSection = 4
): RegionalSectionBlock[] {
  const dict = getDictionary(displayLanguage);
  return REGIONAL_SECTIONS.map((def) => {
    const articles = ranked
      .filter((a) => a.section === def.id && !usedIds.has(a.id))
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, perSection);
    const label = getSectionLabel(def.id, dict, displayLanguage);
    return {
      id: def.id,
      label,
      labelHi: label,
      articles,
    };
  }).filter((s) => s.articles.length > 0);
}

export function buildGeneratedHomepageFeed(
  rows: GeneratedArticleRow[],
  options?: {
    personalization?: RankingPersonalization;
    displayLanguage?: NewsroomLanguage;
  }
): GeneratedHomepageFeed | null {
  const displayLanguage = options?.displayLanguage ?? "hi";
  if (!rows.length) return null;

  const rankedOutputs = rankArticlesForHomepage(rows, {
    personalization: options?.personalization,
  });
  const hyperlocalBundle = buildHyperlocalFeedBundle(rows, {
    maxDistricts: 6,
    displayLanguage,
  });
  const localAlerts = buildLocalBreakingAlerts(rows, { cgOnly: true, limit: 8 });
  const ranked = rankedOutputs
    .map((r) =>
      toHomeArticle(
        r.row,
        {
          priorityScore: r.ranking.priorityScore,
          reasons: r.ranking.reasons,
          isTrending: r.ranking.isTrending,
          isBreaking: r.ranking.isBreaking,
          duplicateClusterId: r.ranking.duplicateClusterId,
          section: r.section,
        },
        displayLanguage
      )
    )
    .filter((a): a is HomeArticle => a !== null);

  if (!ranked.length) {
    homeDebug("buildGeneratedHomepageFeed: no articles for language", {
      displayLanguage,
      poolSize: rows.length,
    });
    return null;
  }

  const usedIds = new Set<string>();

  const pinnedRow = rows.find((r) => r.homepage_pin);
  const pinnedArticle = pinnedRow
    ? ranked.find((a) => a.id === pinnedRow.id)
    : undefined;

  const editorialPool = [...ranked].sort(
    (a, b) => b.priorityScore - a.priorityScore || b.aiConfidence - a.aiConfidence
  );

  const localAlertSlugs = new Set(localAlerts.map((a) => a.slug));
  const cgBreaking = editorialPool.filter(
    (a) =>
      localAlertSlugs.has(a.slug) ||
      ((a.section === "chhattisgarh" || a.section === "raipur") &&
        (a.ranking.isBreaking || a.urgency === "high"))
  );

  const breakingTicker = cgBreaking.length
    ? cgBreaking.slice(0, 8)
    : editorialPool
        .filter((a) => a.ranking.isBreaking || a.urgency === "high")
        .slice(0, 8);

  const tickerItems =
    breakingTicker.length >= 3
      ? breakingTicker
      : editorialPool.filter((a) => a.isLive).slice(0, 8);

  const lead =
    pinnedArticle ??
    editorialPool.find((a) => a.aiConfidence >= 0.45) ??
    editorialPool[0];

  const supporting = editorialPool
    .filter((a) => a.id !== lead.id)
    .slice(0, 4);

  usedIds.add(lead.id);
  for (const s of supporting) usedIds.add(s.id);

  const editorsPicks: EditorsPicksBlock = { lead, supporting };

  const liveWire = [...ranked]
    .filter((a) => !usedIds.has(a.id))
    .sort((a, b) => {
      const live = (b.isLive ? 2 : 0) - (a.isLive ? 2 : 0);
      if (live !== 0) return live;
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    })
    .slice(0, 12);

  for (const w of liveWire) usedIds.add(w.id);

  const regionalHighlights = ranked
    .filter(
      (a) =>
        !usedIds.has(a.id) &&
        (a.section === "chhattisgarh" || a.section === "raipur")
    )
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 6);

  for (const r of regionalHighlights) usedIds.add(r.id);

  let trending = ranked
    .filter((a) => !usedIds.has(a.id) && a.ranking.isTrending)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8);

  if (trending.length < 4) {
    const filler = ranked
      .filter((a) => !usedIds.has(a.id) && !trending.some((t) => t.id === a.id))
      .slice(0, 8 - trending.length);
    trending = [...trending, ...filler];
  }

  for (const t of trending) usedIds.add(t.id);

  const shorts = [...ranked]
    .filter((a) => !usedIds.has(a.id))
    .sort((a, b) => a.summary.length - b.summary.length)
    .slice(0, 10);

  for (const s of shorts) usedIds.add(s.id);

  const categoryStreams = pickCategoryStreams(ranked, usedIds, displayLanguage, 5);

  const avgConfidence =
    ranked.length > 0
      ? Math.round(
          (ranked.reduce((sum, a) => sum + a.aiConfidence, 0) / ranked.length) *
            100
        ) / 100
      : 0;

  const feed: GeneratedHomepageFeed = {
    breakingTicker: tickerItems.length ? tickerItems : editorialPool.slice(0, 6),
    editorsPicks,
    liveWire: liveWire.length ? liveWire : editorialPool.slice(0, 10),
    regionalHighlights:
      regionalHighlights.length > 0
        ? regionalHighlights
        : ranked
            .filter((a) => a.section === "chhattisgarh" || a.section === "raipur")
            .slice(0, 6),
    trending,
    shorts,
    newsShorts: [],
    categoryStreams,
    footerIntelligence: {
      fetchedAt: new Date().toISOString(),
      storyCount: ranked.length,
      breakingCount: rankedOutputs.filter((r) => r.ranking.isBreaking).length,
      trendingCount: rankedOutputs.filter((r) => r.ranking.isTrending).length,
      avgConfidence,
      trendingSearches: getTrendingSearchesForLanguage(displayLanguage, 6),
    },
    hyperlocalFeeds: hyperlocalBundle.feeds.map((f) => ({
      districtSlug: f.districtSlug,
      districtName: pickBilingualLabel(
        displayLanguage,
        f.districtName,
        f.districtNameHi
      ),
      districtNameHi: pickBilingualLabel(
        displayLanguage,
        f.districtName,
        f.districtNameHi
      ),
      articleCount: f.articles.length,
      topHeadline: f.articles[0]?.headline ?? null,
    })),
    localBreakingAlerts: localAlerts
      .map((a) => {
        const match = ranked.find((art) => art.slug === a.slug);
        if (!match) return null;
        return {
          slug: a.slug,
          headline: match.headline,
          district: a.district,
          urgency: a.urgency,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null),
    fetchedAt: new Date().toISOString(),
  };

  return feed;
}
