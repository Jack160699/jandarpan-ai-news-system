/**
 * Homepage slot composition — independent pools, strict uniqueness, desk balance
 */

import { geoFromRecord } from "@/lib/regional";
import { isDisplayableImage } from "@/lib/news/images/validate";
import type { RankedArticleOutput } from "@/lib/news/ai/ranking";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { EditorialDeskBlock, HomeArticle, HomeSectionId } from "@/lib/homepage/types";
import {
  areHomepageDuplicates,
  buildDuplicateIndex,
  collectClusterSiblingIds,
  getDuplicateClusterId,
  pickClusterRepresentatives,
  type DuplicateIndex,
} from "@/lib/homepage/duplicate-detection";
import {
  balanceDistrictSlug,
  classifyEditorialDesk,
  EDITORIAL_BALANCE_DISTRICTS,
  groupArticlesByDesk,
  isCgArticle,
  isInternationalArticle,
  isNationalArticle,
  resolveBalanceDistrictSlug,
  type EditorialDeskId,
  type EditorialBalanceDistrictSlug,
} from "@/lib/homepage/editorial-desks";
import {
  buildEditorialDeskBlocks,
  measureHomepageDeskQuality,
  scoreCompositionCandidate,
  type HomepageDeskQualityMetrics,
} from "@/lib/homepage/homepage-desk-metrics";

const ROUNDUP_RE =
  /\b(10\s*(major|big)|top\s*10|daily\s*digest|roundup|recap|दिनभर|बड़ी\s*खबर|टॉप\s*10|मुख्य\s*समाचार)\b/i;

const CG_SECTIONS = new Set<HomeSectionId>(["chhattisgarh", "raipur"]);

const MAX_SAME_DESK_IN_ROW = 2;
const MAX_SAME_DISTRICT_IN_ROW = 2;
const MAX_CRIME_IN_SLOT = 2;

function freshnessBoost(hours: number): number {
  if (hours < 2) return 40;
  if (hours < 6) return 28;
  if (hours < 12) return 18;
  if (hours < 24) return 8;
  if (hours < 48) return 0;
  return -15;
}

export type HomepageComposition = {
  hero: HomeArticle;
  supporting: HomeArticle[];
  breakingTicker: HomeArticle[];
  trending: HomeArticle[];
  districtWire: HomeArticle[];
  globalBrief: HomeArticle[];
  editorialDesks: EditorialDeskBlock[];
  deskQuality: HomepageDeskQualityMetrics;
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

function compositionContextFromPicked(picked: HomeArticle[], rowsById: Map<string, GeneratedArticleRow>) {
  const deskCounts = new Map<EditorialDeskId, number>();
  const districtCounts = new Map<string, number>();
  const recentDesks: EditorialDeskId[] = [];
  const recentDistricts: string[] = [];

  for (const article of picked) {
    const desk = classifyEditorialDesk(article, rowsById.get(article.id));
    deskCounts.set(desk, (deskCounts.get(desk) ?? 0) + 1);
    recentDesks.push(desk);

    const district = balanceDistrictSlug(article);
    districtCounts.set(district, (districtCounts.get(district) ?? 0) + 1);
    recentDistricts.push(district);
  }

  return { deskCounts, districtCounts, recentDesks, recentDistricts };
}

function wouldClusterDesk(
  article: HomeArticle,
  row: GeneratedArticleRow | undefined,
  picked: HomeArticle[],
  rowsById: Map<string, GeneratedArticleRow>
): boolean {
  const desk = classifyEditorialDesk(article, row);
  const crimeCount = picked.filter(
    (p) => classifyEditorialDesk(p, rowsById.get(p.id)) === "crime"
  ).length;
  if (desk === "crime" && crimeCount >= MAX_CRIME_IN_SLOT) return true;

  const tail = picked.slice(-(MAX_SAME_DESK_IN_ROW - 1));
  if (
    tail.length === MAX_SAME_DESK_IN_ROW - 1 &&
    tail.every((p) => classifyEditorialDesk(p, rowsById.get(p.id)) === desk)
  ) {
    return true;
  }
  return false;
}

function wouldClusterDistrict(
  article: HomeArticle,
  picked: HomeArticle[]
): boolean {
  const district = balanceDistrictSlug(article);
  const tail = picked.slice(-(MAX_SAME_DISTRICT_IN_ROW - 1));
  if (
    tail.length === MAX_SAME_DISTRICT_IN_ROW - 1 &&
    tail.every((p) => balanceDistrictSlug(p) === district)
  ) {
    return true;
  }
  return false;
}

function isCgArticleLocal(article: HomeArticle, row?: GeneratedArticleRow): boolean {
  if (CG_SECTIONS.has(article.section)) return true;
  return isCgArticle(article, row);
}

function scoreHeroCandidate(
  article: HomeArticle,
  row: GeneratedArticleRow | undefined,
  index: DuplicateIndex
): number {
  if (isRoundupArticle(article)) return -10_000;

  let score = article.priorityScore;
  const hours = hoursSince(article.publishedAt);

  if (isCgArticleLocal(article, row)) score += 25;
  if (article.ranking.isBreaking && isCgArticleLocal(article, row)) score += 20;
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

  if (isCgArticleLocal(article, row)) score += 22;
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
  if (isCgArticleLocal(article, row)) score += 6;
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

type DeskPickOptions = PickOptions & {
  rowsById: Map<string, GeneratedArticleRow>;
  preferDesks?: EditorialDeskId[];
  maxCrime?: number;
  balanceDistricts?: boolean;
};

function pickDeskBalancedArticles(options: DeskPickOptions): HomeArticle[] {
  const {
    pool,
    limit,
    reserved,
    index,
    rowsById,
    filter,
    allowClusterRepresentativeOnly = true,
    preferDesks,
    maxCrime = MAX_CRIME_IN_SLOT,
    balanceDistricts = false,
  } = options;

  const representatives = allowClusterRepresentativeOnly
    ? pickClusterRepresentatives(pool, index, (a) => {
        const ctx = compositionContextFromPicked([], rowsById);
        return scoreCompositionCandidate(a, rowsById.get(a.id), ctx);
      })
    : new Set<string>();

  const picked: HomeArticle[] = [];
  const pickedClusters = new Set<string>();
  const usedDesks = new Set<EditorialDeskId>();

  const scoreCandidate = (article: HomeArticle) => {
    const ctx = compositionContextFromPicked(picked, rowsById);
    let score = scoreCompositionCandidate(article, rowsById.get(article.id), ctx);
    score += freshnessBoost(hoursSince(article.publishedAt));
    const desk = classifyEditorialDesk(article, rowsById.get(article.id));
    if (preferDesks?.includes(desk) && !usedDesks.has(desk)) score += 20;
    return score;
  };

  const candidates = [...pool]
    .filter((a) => !filter || filter(a))
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a));

  const deskOrder = preferDesks?.length
    ? preferDesks
    : ([
        "politics",
        "business",
        "sports",
        "technology",
        "education",
        "health",
        "crime",
        "entertainment",
        "district",
        "national",
        "international",
        "opinion",
        "explainers",
        "fact-check",
      ] as EditorialDeskId[]);

  const byDesk = groupArticlesByDesk(candidates, rowsById);
  const districtBuckets = new Map<EditorialBalanceDistrictSlug, HomeArticle[]>();

  if (balanceDistricts) {
    for (const slug of EDITORIAL_BALANCE_DISTRICTS) {
      districtBuckets.set(
        slug,
        candidates.filter((a) => resolveBalanceDistrictSlug(a) === slug)
      );
    }
  }

  function tryPick(article: HomeArticle): boolean {
    if (picked.length >= limit) return false;
    if (reserved.has(article.id)) return false;
    if (picked.some((p) => p.id === article.id)) return false;

    const row = rowsById.get(article.id);
    const desk = classifyEditorialDesk(article, row);
    const crimeCount = picked.filter(
      (p) => classifyEditorialDesk(p, rowsById.get(p.id)) === "crime"
    ).length;
    if (desk === "crime" && crimeCount >= maxCrime) return false;
    if (wouldClusterDesk(article, row, picked, rowsById)) return false;
    if (balanceDistricts && wouldClusterDistrict(article, picked)) return false;

    const clusterId = getDuplicateClusterId(article, index);
    if (
      allowClusterRepresentativeOnly &&
      clusterId &&
      !representatives.has(article.id)
    ) {
      return false;
    }
    if (clusterId && pickedClusters.has(clusterId)) return false;
    if (picked.some((p) => areHomepageDuplicates(p, article, index))) return false;

    picked.push(article);
    usedDesks.add(desk);
    if (clusterId) pickedClusters.add(clusterId);
    return true;
  }

  if (balanceDistricts) {
    let round = 0;
    while (picked.length < limit && round < 20) {
      let added = false;
      for (const slug of EDITORIAL_BALANCE_DISTRICTS) {
        const bucket = districtBuckets.get(slug) ?? [];
        const next = bucket.find((a) => !picked.some((p) => p.id === a.id));
        if (next && tryPick(next)) added = true;
        if (picked.length >= limit) break;
      }
      if (!added) break;
      round++;
    }
  }

  for (const desk of deskOrder) {
    const bucket = (byDesk.get(desk) ?? []).sort(
      (a, b) => scoreCandidate(b) - scoreCandidate(a)
    );
    for (const article of bucket) {
      if (picked.length >= limit) break;
      tryPick(article);
    }
  }

  for (const article of candidates) {
    if (picked.length >= limit) break;
    tryPick(article);
  }

  return picked;
}

function pickBalancedGlobalBrief(
  pool: HomeArticle[],
  limit: number,
  reserved: Set<string>,
  index: DuplicateIndex,
  rowsById: Map<string, GeneratedArticleRow>
): HomeArticle[] {
  const national = pool.filter(
    (a) =>
      isNationalArticle(a) ||
      classifyEditorialDesk(a, rowsById.get(a.id)) === "national"
  );
  const international = pool.filter(
    (a) =>
      isInternationalArticle(a) ||
      classifyEditorialDesk(a, rowsById.get(a.id)) === "international"
  );

  const half = Math.ceil(limit / 2);
  const nationalPicks = pickDeskBalancedArticles({
    pool: national.length ? national : pool,
    limit: half,
    reserved,
    index,
    rowsById,
    preferDesks: ["national", "politics"],
  });

  const intReserved = new Set([...reserved, ...nationalPicks.map((a) => a.id)]);
  const intPicks = pickDeskBalancedArticles({
    pool: international.length ? international : pool,
    limit: limit - nationalPicks.length,
    reserved: intReserved,
    index,
    rowsById,
    preferDesks: ["international"],
  });

  const merged: HomeArticle[] = [];
  const maxLen = Math.max(nationalPicks.length, intPicks.length);
  for (let i = 0; i < maxLen; i++) {
    if (nationalPicks[i]) merged.push(nationalPicks[i]);
    if (intPicks[i]) merged.push(intPicks[i]);
    if (merged.length >= limit) break;
  }

  if (merged.length < limit) {
    const fill = pickDeskBalancedArticles({
      pool,
      limit: limit - merged.length,
      reserved: new Set([...reserved, ...merged.map((a) => a.id)]),
      index,
      rowsById,
    });
    merged.push(...fill);
  }

  return merged.slice(0, limit);
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

  const supporting = pickDeskBalancedArticles({
    pool: ranked.filter((a) => a.id !== hero.id),
    limit: 4,
    reserved,
    index,
    rowsById,
    filter: (a) => !isRoundupArticle(a),
    preferDesks: [
      "politics",
      "business",
      "sports",
      "education",
      "health",
      "technology",
      "crime",
      "entertainment",
    ],
    maxCrime: 1,
  });
  for (const s of supporting) reserved.add(s.id);

  const breakingPool = ranked.filter(
    (a) =>
      a.ranking.isBreaking ||
      a.urgency === "high" ||
      a.isLive
  );

  const breakingTicker = pickDeskBalancedArticles({
    pool: breakingPool.length ? breakingPool : ranked,
    limit: 8,
    reserved,
    index,
    rowsById,
    filter: (a) => a.id !== hero.id,
    preferDesks: [
      "politics",
      "crime",
      "business",
      "sports",
      "district",
      "national",
      "weather",
      "election",
    ],
    maxCrime: 2,
  });
  for (const b of breakingTicker) reserved.add(b.id);

  const trending = pickDeskBalancedArticles({
    pool: ranked,
    limit: 8,
    reserved,
    index,
    rowsById,
    filter: (a) => hoursSince(a.publishedAt) <= 72,
    preferDesks: [
      "politics",
      "business",
      "technology",
      "sports",
      "entertainment",
      "education",
      "health",
      "crime",
      "opinion",
      "explainers",
      "fact-check",
    ],
    maxCrime: 2,
  });
  for (const t of trending) reserved.add(t.id);

  const districtWire = pickDeskBalancedArticles({
    pool: ranked.filter((a) => isCgArticleLocal(a, rowsById.get(a.id))),
    limit: 14,
    reserved,
    index,
    rowsById,
    preferDesks: ["district"],
    balanceDistricts: true,
    maxCrime: 2,
  });
  for (const d of districtWire) reserved.add(d.id);

  const globalBrief = pickBalancedGlobalBrief(
    ranked,
    14,
    reserved,
    index,
    rowsById
  );
  for (const g of globalBrief) reserved.add(g.id);

  const reelsFromFresh = pickUniqueArticles({
    pool: ranked.filter((a) => !reserved.has(a.id)),
    limit: 10,
    reserved: new Set<string>(),
    index,
    scoreFn: (a) => scoreReelsCandidate(a, rowsById.get(a.id)),
    allowClusterRepresentativeOnly: true,
  });

  let reelsArticleIds = reelsFromFresh.map((a) => a.id);

  if (reelsArticleIds.length < 6) {
    const reelsWithOverlap = pickUniqueArticles({
      pool: ranked,
      limit: 10,
      reserved: new Set(reelsArticleIds),
      index,
      scoreFn: (a) => scoreReelsCandidate(a, rowsById.get(a.id)),
      allowClusterRepresentativeOnly: true,
    });

    let overlap = 0;
    for (const reel of reelsWithOverlap) {
      if (reelsArticleIds.length >= 10) break;
      if (reserved.has(reel.id)) {
        if (overlap >= 1) continue;
        overlap++;
      }
      if (reelsArticleIds.includes(reel.id)) continue;
      reelsArticleIds.push(reel.id);
    }
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

  const editorialDesks = buildEditorialDeskBlocks(ranked, rowsById, new Set());

  const deskQuality = measureHomepageDeskQuality(
    {
      editorsPicks: { lead: hero, supporting },
      breakingTicker,
      trending,
      liveWire: globalBrief,
      regionalHighlights: districtWire,
      newsShorts: [],
      editorialDesks,
      categoryStreams: [],
      shorts: [],
      footerIntelligence: {
        fetchedAt: new Date().toISOString(),
        storyCount: ranked.length,
        breakingCount: 0,
        trendingCount: 0,
        avgConfidence: 0,
        trendingSearches: [],
      },
      hyperlocalFeeds: [],
      localBreakingAlerts: [],
      fetchedAt: new Date().toISOString(),
    },
    rowsById
  );

  return {
    hero,
    supporting,
    breakingTicker,
    trending,
    districtWire,
    globalBrief,
    editorialDesks,
    deskQuality,
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
