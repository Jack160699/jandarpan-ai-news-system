/**
 * AI-ranked homepage feed from generated_articles
 */

import {
  computeHomepagePriorityScore,
  rankArticlesForHomepage,
} from "@/lib/news/ai/ranking";
import { buildOpenGraphImageUrl, optimizeCdnImageUrl } from "@/lib/news/ai/editorial-image-compress";
import { resolveFallbackImage } from "@/lib/news/images/fallbacks";
import { isDisplayableImage } from "@/lib/news/images/validate";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type {
  GeneratedHomepageFeed,
  HomeArticle,
  HomeSectionId,
  HomeUrgency,
  RegionalSectionBlock,
} from "@/lib/homepage/types";

const LIVE_WINDOW_HOURS = 8;
const HIGH_URGENCY_HOURS = 3;

export const REGIONAL_SECTIONS: Array<{
  id: HomeSectionId;
  label: string;
  labelHi: string;
  matchers: RegExp[];
}> = [
  {
    id: "chhattisgarh",
    label: "Chhattisgarh",
    labelHi: "छत्तीसगढ़",
    matchers: [/chhattisgarh/i, /छत्तीसगढ/i, /bastar/i, /बस्तर/i, /bilaspur/i, /durg/i, /korba/i, /jagdalpur/i],
  },
  {
    id: "raipur",
    label: "Raipur",
    labelHi: "रायपुर",
    matchers: [/raipur/i, /रायपुर/i, /naya raipur/i, /नया रायपुर/i],
  },
  {
    id: "india",
    label: "India",
    labelHi: "भारत",
    matchers: [/\bindia\b/i, /भारत/i, /national/i, /देश/i, /centre/i, /central government/i],
  },
  {
    id: "world",
    label: "World",
    labelHi: "विश्व",
    matchers: [/world/i, /global/i, /international/i, /विश्व/i, /अंतर्राष्ट्र/i],
  },
  {
    id: "business",
    label: "Business",
    labelHi: "व्यापार",
    matchers: [/business/i, /economy/i, /market/i, /व्यापार/i, /अर्थव्यवस्था/i, /industry/i, /steel/i, /coal/i],
  },
  {
    id: "sports",
    label: "Sports",
    labelHi: "खेल",
    matchers: [/sport/i, /cricket/i, /खेल/i, /क्रिकेट/i, /match/i],
  },
  {
    id: "education",
    label: "Education",
    labelHi: "शिक्षा",
    matchers: [/education/i, /school/i, /university/i, /शिक्षा/i, /स्कूल/i, /exam/i, /student/i],
  },
];

function hoursSince(iso: string | null): number {
  if (!iso) return 72;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function inferSection(row: GeneratedArticleRow): HomeSectionId {
  const tag = row.tags[0]?.toLowerCase() ?? "";
  const text = `${row.headline} ${row.summary ?? ""} ${tag}`.toLowerCase();

  for (const section of REGIONAL_SECTIONS) {
    if (section.matchers.some((re) => re.test(text))) return section.id;
  }

  const tagMap: Record<string, HomeSectionId> = {
    local: "chhattisgarh",
    politics: "india",
    world: "world",
    business: "business",
    sports: "sports",
    health: "education",
    technology: "business",
    entertainment: "world",
  };

  return tagMap[tag] ?? "chhattisgarh";
}

function resolveImageUrls(row: GeneratedArticleRow): {
  hero: string;
  og: string;
} {
  const meta = row.editorial_metadata?.image;
  const heroRaw =
    row.hero_image_url ||
    meta?.og_url ||
    meta?.hero_url ||
    null;

  const category = row.tags[0] ?? "world";
  const hero = heroRaw && isDisplayableImage(heroRaw)
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

/** @deprecated use priorityScore from rankArticlesForHomepage */
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
  }
): HomeArticle {
  const { hero, og } = resolveImageUrls(row);
  const hours = hoursSince(row.published_at);
  const meta = row.editorial_metadata ?? {};
  const confidence = meta.ai_confidence ?? 0.55;
  const publishedAt = row.published_at ?? row.created_at;

  const section = ranked?.section ?? inferSection(row);
  const priorityScore = ranked?.priorityScore ?? 0;

  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    summary: row.summary?.trim() || row.seo_description?.trim() || "",
    imageUrl: hero,
    ogImageUrl: og,
    section,
    readingTime: row.reading_time ?? "3 min",
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
    language: row.language ?? "hi",
    tags: row.tags,
    aiConfidence: confidence,
  };
}

function pickRegionalSections(
  ranked: HomeArticle[],
  heroId: string,
  usedIds: Set<string>,
  perSection = 4
): RegionalSectionBlock[] {
  return REGIONAL_SECTIONS.map((def) => {
    const articles = ranked
      .filter((a) => a.id !== heroId && a.section === def.id && !usedIds.has(a.id))
      .slice(0, perSection);

    for (const a of articles) usedIds.add(a.id);

    return {
      id: def.id,
      label: def.label,
      labelHi: def.labelHi,
      articles,
    };
  }).filter((s) => s.articles.length > 0);
}

export function buildGeneratedHomepageFeed(
  rows: GeneratedArticleRow[]
): GeneratedHomepageFeed | null {
  if (!rows.length) return null;

  const rankedOutputs = rankArticlesForHomepage(rows);

  const ranked = rankedOutputs.map((r) =>
    toHomeArticle(r.row, {
      priorityScore: r.ranking.priorityScore,
      reasons: r.ranking.reasons,
      isTrending: r.ranking.isTrending,
      isBreaking: r.ranking.isBreaking,
      duplicateClusterId: r.ranking.duplicateClusterId,
      section: r.section,
    })
  );

  const pinnedRow = rows.find((r) => r.homepage_pin);
  const pinnedArticle = pinnedRow
    ? ranked.find((a) => a.id === pinnedRow.id)
    : undefined;

  const hero = pinnedArticle ?? ranked[0];
  const usedIds = new Set<string>([hero.id]);

  const liveUpdates = [...ranked]
    .filter((a) => a.id !== hero.id)
    .sort((a, b) => {
      const breakBoost =
        (b.ranking.isBreaking ? 3 : 0) - (a.ranking.isBreaking ? 3 : 0);
      if (breakBoost !== 0) return breakBoost;
      const liveBoost = (b.isLive ? 2 : 0) - (a.isLive ? 2 : 0);
      if (liveBoost !== 0) return liveBoost;
      return b.priorityScore - a.priorityScore;
    })
    .slice(0, 14);

  for (const a of liveUpdates) usedIds.add(a.id);

  const regional = pickRegionalSections(ranked, hero.id, usedIds);

  const trending = ranked
    .filter((a) => !usedIds.has(a.id) && a.ranking.isTrending)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8);

  if (trending.length < 4) {
    const filler = ranked
      .filter((a) => !usedIds.has(a.id) && !trending.some((t) => t.id === a.id))
      .slice(0, 8 - trending.length);
    trending.push(...filler);
  }

  for (const a of trending) usedIds.add(a.id);

  const shorts = [...ranked]
    .filter((a) => !usedIds.has(a.id))
    .sort((a, b) => a.summary.length - b.summary.length)
    .slice(0, 10);

  const analytics = rankedOutputs.length
    ? {
        poolSize: rankedOutputs.length,
        trendingCount: rankedOutputs.filter((r) => r.ranking.isTrending).length,
        breakingCount: rankedOutputs.filter((r) => r.ranking.isBreaking).length,
        avgPriorityScore:
          rankedOutputs.reduce((s, r) => s + r.ranking.priorityScore, 0) /
          rankedOutputs.length,
      }
    : undefined;

  return {
    hero,
    liveUpdates,
    regional,
    trending,
    shorts,
    fetchedAt: new Date().toISOString(),
    rankingAnalytics: analytics
      ? {
          poolSize: analytics.poolSize,
          trendingCount: analytics.trendingCount,
          breakingCount: analytics.breakingCount,
          avgPriorityScore:
            Math.round(analytics.avgPriorityScore * 10) / 10,
        }
      : undefined,
  };
}
