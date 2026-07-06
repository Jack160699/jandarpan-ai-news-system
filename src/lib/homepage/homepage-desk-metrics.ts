/**
 * Homepage desk quality metrics — composition verification only
 */

import { isDisplayableImage } from "@/lib/news/images/validate";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type {
  EditorialDeskBlock,
  GeneratedHomepageFeed,
  HomeArticle,
  HomepageDeskQuality,
} from "@/lib/homepage/types";
import {
  classifyEditorialDesk,
  EDITORIAL_BALANCE_DISTRICTS,
  EDITORIAL_DESKS,
  balanceDistrictSlug,
  type EditorialDeskId,
} from "@/lib/homepage/editorial-desks";
import { countHomepageDuplicates } from "@/lib/homepage/homepage-composition";

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export type HomepageDeskQualityMetrics = HomepageDeskQuality;

function visibleArticles(feed: GeneratedHomepageFeed): HomeArticle[] {
  return [
    feed.editorsPicks.lead,
    ...feed.editorsPicks.supporting,
    ...feed.breakingTicker,
    ...feed.trending,
    ...feed.liveWire,
    ...feed.regionalHighlights,
  ];
}

function freshnessScore(hours: number): number {
  if (hours < 2) return 100;
  if (hours < 6) return 85;
  if (hours < 12) return 70;
  if (hours < 24) return 50;
  if (hours < 48) return 30;
  return 10;
}

function imageQualityScore(article: HomeArticle, row?: GeneratedArticleRow): number {
  const url = row?.hero_image_url ?? article.imageUrl;
  if (!url?.trim()) return 0;
  return isDisplayableImage(url) ? 100 : 40;
}

export function scoreCompositionCandidate(
  article: HomeArticle,
  row: GeneratedArticleRow | undefined,
  context: {
    deskCounts: Map<EditorialDeskId, number>;
    districtCounts: Map<string, number>;
    recentDesks: EditorialDeskId[];
    recentDistricts: string[];
  }
): number {
  const hours = hoursSince(article.publishedAt);
  let score = freshnessScore(hours) * 0.35;
  score += article.aiConfidence * 100 * 0.2;
  score += imageQualityScore(article, row) * 0.15;
  score += Math.min(100, article.priorityScore) * 0.15;
  score += Math.min(20, article.sourceCount * 4) * 0.15;

  const desk = classifyEditorialDesk(article, row);
  const deskCount = context.deskCounts.get(desk) ?? 0;
  if (deskCount >= 2) score -= 25;
  if (context.recentDesks.slice(-2).every((d) => d === desk)) score -= 30;

  const district = balanceDistrictSlug(article);
  const districtCount = context.districtCounts.get(district) ?? 0;
  if (districtCount >= 2) score -= 20;
  if (context.recentDistricts.slice(-2).every((d) => d === district)) score -= 25;

  if (hours > 48 && article.urgency !== "high" && !article.ranking.isBreaking) {
    score -= 20;
  }

  return score;
}

export function measureHomepageDeskQuality(
  feed: GeneratedHomepageFeed,
  rowsById?: Map<string, GeneratedArticleRow>
): HomepageDeskQualityMetrics {
  const articles = visibleArticles(feed);
  const desks = feed.editorialDesks ?? [];

  const deskIds = new Set<EditorialDeskId>();
  for (const article of articles) {
    deskIds.add(classifyEditorialDesk(article, rowsById?.get(article.id)));
  }

  const districtIds = new Set<string>();
  for (const article of feed.regionalHighlights) {
    districtIds.add(balanceDistrictSlug(article));
  }

  const categoryDiversity = Math.min(
    100,
    articles.length > 0
      ? Math.round((deskIds.size / Math.min(articles.length, EDITORIAL_DESKS.length)) * 100)
      : 0
  );

  const districtDiversity = Math.min(
    100,
    feed.regionalHighlights.length > 0
      ? Math.round(
          (districtIds.size /
            Math.min(feed.regionalHighlights.length, EDITORIAL_BALANCE_DISTRICTS.length)) *
            100
        )
      : 0
  );

  const freshnessHours =
    articles.length > 0
      ? articles.reduce((sum, a) => sum + hoursSince(a.publishedAt), 0) / articles.length
      : 0;

  const avgConfidence =
    articles.length > 0
      ? articles.reduce((sum, a) => sum + a.aiConfidence, 0) / articles.length
      : 0;

  const avgImageQuality =
    articles.length > 0
      ? articles.reduce(
          (sum, a) => sum + imageQualityScore(a, rowsById?.get(a.id)),
          0
        ) / articles.length
      : 0;

  const duplicateCount = countHomepageDuplicates({
    editorsPicks: feed.editorsPicks,
    breakingTicker: feed.breakingTicker,
    trending: feed.trending,
    liveWire: feed.liveWire,
    regionalHighlights: feed.regionalHighlights,
    newsShorts: feed.newsShorts,
  });

  const targetDesks = EDITORIAL_DESKS.filter((d) => !d.optional);
  const desksFilled = desks.filter((d) => d.articles.length > 0).length;
  const sectionCompletionPct = Math.min(
    100,
    targetDesks.length > 0 ? Math.round((desksFilled / targetDesks.length) * 100) : 0
  );

  const hero = feed.editorsPicks.lead;
  const heroRow = rowsById?.get(hero.id);
  const heroHours = hoursSince(hero.publishedAt);
  let heroQuality = freshnessScore(heroHours) * 0.3;
  heroQuality += hero.aiConfidence * 100 * 0.25;
  heroQuality += imageQualityScore(hero, heroRow) * 0.25;
  heroQuality += Math.min(100, hero.priorityScore) * 0.2;

  return {
    categoryDiversity,
    districtDiversity,
    avgFreshnessHours: Math.round(freshnessHours * 10) / 10,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    avgImageQuality: Math.round(avgImageQuality),
    duplicateCount,
    sectionCompletionPct,
    heroQuality: Math.round(heroQuality),
    desksFilled,
    desksTotal: targetDesks.length,
  };
}

export function buildEditorialDeskBlocks(
  ranked: HomeArticle[],
  rowsById: Map<string, GeneratedArticleRow>,
  reserved: Set<string>
): EditorialDeskBlock[] {
  const groups = new Map<EditorialDeskId, HomeArticle[]>();

  for (const article of ranked) {
    if (reserved.has(article.id)) continue;
    const desk = classifyEditorialDesk(article, rowsById.get(article.id));
    const list = groups.get(desk) ?? [];
    if (list.length < (getDeskDefQuota(desk) ?? 3)) {
      list.push(article);
      groups.set(desk, list);
    }
  }

  return EDITORIAL_DESKS.map((def) => {
    const articles = (groups.get(def.id) ?? [])
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, def.quota);
    return {
      id: def.id,
      label: def.label,
      labelHi: def.labelHi,
      articles,
      collapsed: articles.length === 0,
    };
  }).filter((block) => !block.collapsed || !EDITORIAL_DESKS.find((d) => d.id === block.id)?.optional);
}

function getDeskDefQuota(desk: EditorialDeskId): number | undefined {
  return EDITORIAL_DESKS.find((d) => d.id === desk)?.quota;
}

export function maxConsecutiveSame<T>(items: T[], keyFn: (item: T) => string): number {
  let max = 0;
  let current = 0;
  let prev = "";

  for (const item of items) {
    const key = keyFn(item);
    if (key === prev) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 1;
      prev = key;
    }
  }
  return max;
}
