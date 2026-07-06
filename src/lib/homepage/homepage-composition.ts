/**
 * Homepage slot composition — independent pools, strict uniqueness
 */

import { geoFromRecord } from "@/lib/regional";
import { isDisplayableImage } from "@/lib/news/images/validate";
import type { RankedArticleOutput } from "@/lib/news/ai/ranking";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { HomeArticle, HomeSectionId } from "@/lib/homepage/types";
import {
  areHomepageDuplicates,
  buildDuplicateIndex,
  collectClusterSiblingIds,
  getDuplicateClusterId,
  pickClusterRepresentatives,
  type DuplicateIndex,
} from "@/lib/homepage/duplicate-detection";

const ROUNDUP_RE =
  /\b(10\s*(major|big)|top\s*10|daily\s*digest|roundup|recap|दिनभर|बड़ी\s*खबर|टॉप\s*10|मुख्य\s*समाचार)\b/i;

const CG_SECTIONS = new Set<HomeSectionId>(["chhattisgarh", "raipur"]);

export type HomepageComposition = {
  hero: HomeArticle;
  supporting: HomeArticle[];
  breakingTicker: HomeArticle[];
  trending: HomeArticle[];
  districtWire: HomeArticle[];
  globalBrief: HomeArticle[];
  reelsArticleIds: string[];
  listenArticleIds: string[];
  reservedIds: Set<string>;
  duplicateIndex: DuplicateIndex;
};

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function isRoundupArticle(article: HomeArticle): boolean {
  const text = `${article.headline} ${article.summary}`.toLowerCase();
  return ROUNDUP_RE.test(text);
}

function hasStrongImage(article: HomeArticle, row?: GeneratedArticleRow): boolean {
  const url = row?.hero_image_url ?? article.imageUrl;
  return Boolean(url?.trim() && isDisplayableImage(url));
}

function isCgArticle(article: HomeArticle, row?: GeneratedArticleRow): boolean {
  if (CG_SECTIONS.has(article.section)) return true;
  if (!row) return false;
  return geoFromRecord(row).is_chhattisgarh;
}

function scoreHeroCandidate(
  article: HomeArticle,
  row: GeneratedArticleRow | undefined,
  index: DuplicateIndex
): number {
  if (isRoundupArticle(article)) return -10_000;

  let score = article.priorityScore;
  const hours = hoursSince(article.publishedAt);

  if (isCgArticle(article, row)) score += 25;
  if (article.ranking.isBreaking && isCgArticle(article, row)) score += 20;
  if (article.urgency === "high") score += 12;
  if (hasStrongImage(article, row)) score += 15;
  score += article.aiConfidence * 20;
  if (hours <= 6) score += 10;
  else if (hours <= 24) score += 4;
  else score -= 8;

  const clusterId = getDuplicateClusterId(article, index);
  if (clusterId) score -= 5;

  if (article.section === "india" || article.section === "world") score -= 15;

  return score;
}

function scoreTrendingCandidate(
  article: HomeArticle,
  row: GeneratedArticleRow | undefined
): number {
  if (isRoundupArticle(article)) return -1_000;

  const hours = hoursSince(article.publishedAt);
  let score = 0;

  if (hours <= 12) score += 30;
  else if (hours <= 24) score += 18;
  else if (hours <= 48) score += 6;
  else score -= 20;

  if (isCgArticle(article, row)) score += 22;
  if (article.section === "raipur") score += 8;
  if (article.sourceCount >= 2) score += 8;
  if (article.summary.trim().length > 80) score += 6;
  if (hasStrongImage(article, row)) score += 5;

  score += Math.min(12, article.priorityScore * 0.12);
  return score;
}

function scoreReelsCandidate(
  article: HomeArticle,
  row: GeneratedArticleRow | undefined
): number {
  const hours = hoursSince(article.publishedAt);
  let score = article.priorityScore * 0.4;
  if (hours <= 24) score += 20;
  if (article.summary.length >= 60 && article.summary.length <= 280) score += 10;
  if (hasStrongImage(article, row)) score += 8;
  if (isCgArticle(article, row)) score += 6;
  if (isRoundupArticle(article)) score -= 50;
  return score;
}

type PickOptions = {
  pool: HomeArticle[];
  limit: number;
  reserved: Set<string>;
  index: DuplicateIndex;
  scoreFn?: (a: HomeArticle) => number;
  filter?: (a: HomeArticle) => boolean;
  allowClusterRepresentativeOnly?: boolean;
};

function pickUniqueArticles(options: PickOptions): HomeArticle[] {
  const {
    pool,
    limit,
    reserved,
    index,
    scoreFn,
    filter,
    allowClusterRepresentativeOnly = true,
  } = options;

  const representatives = allowClusterRepresentativeOnly
    ? pickClusterRepresentatives(
        pool,
        index,
        (a) => scoreFn?.(a) ?? a.priorityScore
      )
    : new Set<string>();

  const picked: HomeArticle[] = [];
  const pickedClusters = new Set<string>();

  const candidates = [...pool]
    .filter((a) => !filter || filter(a))
    .sort((a, b) => (scoreFn?.(b) ?? b.priorityScore) - (scoreFn?.(a) ?? a.priorityScore));

  for (const article of candidates) {
    if (picked.length >= limit) break;
    if (reserved.has(article.id)) continue;

    const clusterId = getDuplicateClusterId(article, index);
    if (
      allowClusterRepresentativeOnly &&
      clusterId &&
      !representatives.has(article.id)
    ) {
      continue;
    }
    if (clusterId && pickedClusters.has(clusterId)) continue;

    if (picked.some((p) => areHomepageDuplicates(p, article, index))) continue;

    picked.push(article);
    if (clusterId) pickedClusters.add(clusterId);
  }

  return picked;
}

function rowsByIdFromRanked(ranked: RankedArticleOutput[]): Map<string, GeneratedArticleRow> {
  return new Map(ranked.map((r) => [r.row.id, r.row]));
}

export function composeHomepageSlots(
  ranked: HomeArticle[],
  rankedOutputs: RankedArticleOutput[],
  options?: {
    pinnedLead?: HomeArticle;
  }
): HomepageComposition {
  const rowsById = rowsByIdFromRanked(rankedOutputs);
  const index = buildDuplicateIndex(ranked, rowsById);
  const reserved = new Set<string>();

  const scoreHero = (a: HomeArticle) =>
    scoreHeroCandidate(a, rowsById.get(a.id), index);

  const nonRoundup = ranked.filter((a) => !isRoundupArticle(a));
  const heroPool = nonRoundup.length ? nonRoundup : ranked;

  const hero =
    options?.pinnedLead ??
    [...heroPool].sort((a, b) => scoreHero(b) - scoreHero(a))[0] ??
    ranked[0];

  reserved.add(hero.id);
  for (const sibling of collectClusterSiblingIds(hero, index)) {
    reserved.add(sibling);
  }

  const supporting = pickUniqueArticles({
    pool: ranked.filter((a) => a.id !== hero.id),
    limit: 4,
    reserved,
    index,
    scoreFn: (a) => a.priorityScore,
    filter: (a) => !isRoundupArticle(a),
  });
  for (const s of supporting) reserved.add(s.id);

  const breakingPool = ranked.filter(
    (a) =>
      a.ranking.isBreaking ||
      a.urgency === "high" ||
      a.isLive
  );

  const breakingTicker = pickUniqueArticles({
    pool: breakingPool.length ? breakingPool : ranked,
    limit: 8,
    reserved,
    index,
    scoreFn: (a) => {
      const row = rowsById.get(a.id);
      let s = a.priorityScore;
      if (isCgArticle(a, row)) s += 15;
      if (a.isLive) s += 8;
      return s;
    },
    filter: (a) => a.id !== hero.id,
  });
  for (const b of breakingTicker) reserved.add(b.id);

  const trending = pickUniqueArticles({
    pool: ranked,
    limit: 8,
    reserved,
    index,
    scoreFn: (a) => scoreTrendingCandidate(a, rowsById.get(a.id)),
    filter: (a) => hoursSince(a.publishedAt) <= 72,
  });
  for (const t of trending) reserved.add(t.id);

  const districtWire = pickUniqueArticles({
    pool: ranked.filter((a) => isCgArticle(a, rowsById.get(a.id))),
    limit: 14,
    reserved,
    index,
    scoreFn: (a) => {
      const row = rowsById.get(a.id);
      let s = a.priorityScore;
      if (a.section === "raipur") s += 10;
      if (row && (geoFromRecord(row).districts?.length ?? 0) > 0) s += 12;
      return s;
    },
  });
  for (const d of districtWire) reserved.add(d.id);

  const globalBrief = pickUniqueArticles({
    pool: ranked,
    limit: 14,
    reserved,
    index,
    scoreFn: (a) => {
      let s = a.priorityScore;
      if (a.isLive) s += 10;
      if (a.section === "india" || a.section === "world") s += 6;
      return s;
    },
  });
  for (const g of globalBrief) reserved.add(g.id);

  const reelsPicks = pickUniqueArticles({
    pool: ranked,
    limit: 10,
    reserved: new Set<string>(),
    index,
    scoreFn: (a) => scoreReelsCandidate(a, rowsById.get(a.id)),
    allowClusterRepresentativeOnly: true,
  });

  let reelsOverlap = 0;
  const reelsArticleIds: string[] = [];
  for (const reel of reelsPicks) {
    if (reserved.has(reel.id)) {
      if (reelsOverlap >= 1) continue;
      reelsOverlap++;
    }
    reelsArticleIds.push(reel.id);
  }

  const listenPicks = pickUniqueArticles({
    pool: ranked,
    limit: 24,
    reserved: new Set<string>(),
    index,
    scoreFn: (a) => scoreReelsCandidate(a, rowsById.get(a.id)) + (a.isLive ? 5 : 0),
    filter: (a) => a.summary.trim().length > 30,
  });

  let listenOverlap = 0;
  const listenArticleIds: string[] = [];
  for (const item of listenPicks) {
    if (reserved.has(item.id)) {
      if (listenOverlap >= 2) continue;
      listenOverlap++;
    }
    listenArticleIds.push(item.id);
  }

  return {
    hero,
    supporting,
    breakingTicker,
    trending,
    districtWire,
    globalBrief,
    reelsArticleIds,
    listenArticleIds,
    reservedIds: reserved,
    duplicateIndex: index,
  };
}

export function countHomepageDuplicates(feed: {
  editorsPicks: { lead: HomeArticle; supporting: HomeArticle[] };
  breakingTicker: HomeArticle[];
  trending: HomeArticle[];
  liveWire: HomeArticle[];
  regionalHighlights: HomeArticle[];
  newsShorts: { articleId: string }[];
}): number {
  const ids: string[] = [
    feed.editorsPicks.lead.id,
    ...feed.editorsPicks.supporting.map((a) => a.id),
    ...feed.breakingTicker.map((a) => a.id),
    ...feed.trending.map((a) => a.id),
    ...feed.liveWire.map((a) => a.id),
    ...feed.regionalHighlights.map((a) => a.id),
    ...feed.newsShorts.map((s) => s.articleId),
  ];

  const seen = new Set<string>();
  let dupes = 0;
  for (const id of ids) {
    if (seen.has(id)) dupes++;
    else seen.add(id);
  }
  return dupes;
}

export function homepageDiversityScore(feed: {
  editorsPicks: { lead: HomeArticle; supporting: HomeArticle[] };
  breakingTicker: HomeArticle[];
  trending: HomeArticle[];
  liveWire: HomeArticle[];
  regionalHighlights: HomeArticle[];
}): number {
  const all = [
    feed.editorsPicks.lead,
    ...feed.editorsPicks.supporting,
    ...feed.breakingTicker,
    ...feed.trending,
    ...feed.liveWire,
    ...feed.regionalHighlights,
  ];
  const unique = new Set(all.map((a) => a.id));
  if (!all.length) return 0;
  return Math.round((unique.size / all.length) * 100);
}
