/**
 * Homepage ranking — freshness, regional boost, source priority, breaking
 */

import { resolveArticleProvider } from "@/lib/news/article-provider";
import { isDisplayableImage } from "@/lib/news/images/validate";
import type {
  LiveNewsFeed,
  NewsArticleRow,
  NewsCategory,
  TopicTrend,
} from "@/lib/types/news-article";
import { NEWS_INGEST_CATEGORIES } from "@/lib/types/news-article";

export const LIVE_NEWS_CACHE_TAG = "live-news";

const REGIONAL_PATTERNS = [
  /raipur/i,
  /bilaspur/i,
  /bastar/i,
  /durg/i,
  /chhattisgarh/i,
  /छत्तीसगढ़/,
  /छत्तीसगढ/i,
  /रायपुर/,
  /बिलासपुर/,
  /बस्तर/,
  /दुर्ग/,
];

const BREAKING_PATTERNS = [
  /\bbreaking\b/i,
  /\blive\b/i,
  /\burgent\b/i,
  /\bexclusive\b/i,
  /बड़ी खबर/,
  /ताजा/,
  /ब्रेकिंग/,
  /लाइव/,
];

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "and",
  "is",
  "are",
  "with",
  "from",
  "की",
  "के",
  "में",
  "से",
  "को",
  "पर",
  "और",
  "एक",
  "यह",
  "है",
  "news",
  "समाचार",
]);

export type RankedArticle = NewsArticleRow & {
  rankScore: number;
  isLive: boolean;
  isBreaking: boolean;
  regionalBoost: number;
};

export function isArticleLive(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  return ageMs >= 0 && ageMs < 30 * 60 * 1000;
}

function articleAgeHours(publishedAt: string | null): number {
  if (!publishedAt) return 48;
  return (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
}

/** Freshness 0–100 with decay at 6h / 12h / 24h */
export function freshnessScore(publishedAt: string | null): number {
  const ageH = articleAgeHours(publishedAt);
  if (ageH < 0.5) return 100;
  if (ageH <= 6) return 95 - ageH * 8;
  if (ageH <= 12) return 47 - (ageH - 6) * 6;
  if (ageH <= 24) return 11 - (ageH - 12) * 0.75;
  return Math.max(2, 5 - (ageH - 24) * 0.2);
}

export function regionalBoostScore(article: NewsArticleRow): number {
  let score = 0;
  if (article.region === "chhattisgarh") score += 45;
  if (article.category === "local") score += 25;

  const text = `${article.title} ${article.description ?? ""} ${article.source ?? ""}`;
  for (const re of REGIONAL_PATTERNS) {
    if (re.test(text)) {
      score += 35;
      break;
    }
  }

  if (/raipur/i.test(text)) score += 20;

  return Math.min(100, score);
}

export function breakingBoostScore(article: NewsArticleRow): number {
  const text = `${article.title} ${article.description ?? ""}`;
  for (const re of BREAKING_PATTERNS) {
    if (re.test(text)) return 30;
  }
  return 0;
}

export function sourcePriorityScore(article: NewsArticleRow): number {
  const provider = resolveArticleProvider(article);
  if (provider === "rss" && article.region === "chhattisgarh") return 50;
  if (provider === "rss") return 42;
  if (provider === "gnews" && article.region === "india") return 28;
  if (provider === "newsdata" && article.region === "india") return 24;
  if (article.category === "local") return 20;
  if (article.region === "global" || article.category === "world") return 8;
  return 15;
}

export function homepageImageScore(article: NewsArticleRow): number {
  if (!article.image_url) return 0;
  if (!isDisplayableImage(article.image_url)) return 0;
  if (article.image_url.includes("images.unsplash.com")) return 8;
  return 22;
}

/** Display tier: CG RSS → Raipur → India breaking → national → global */
export function displayTier(article: NewsArticleRow): number {
  const text = `${article.title} ${article.description ?? ""}`;
  if (resolveArticleProvider(article) === "rss" && article.region === "chhattisgarh") return 5;
  if (/raipur|रायपुर/i.test(text)) return 4;
  if (breakingBoostScore(article) > 0 && article.region === "india") return 3;
  if (article.region === "india" || article.category === "politics") return 2;
  if (article.region === "global" || article.category === "world") return 1;
  return 0;
}

export function computeRankScore(article: NewsArticleRow): number {
  const tier = displayTier(article) * 120;
  const freshness = freshnessScore(article.published_at);
  const source = sourcePriorityScore(article);
  const regional = regionalBoostScore(article);
  const breaking = breakingBoostScore(article);
  const image = homepageImageScore(article);
  const live = isArticleLive(article.published_at) ? 25 : 0;

  return (
    tier +
    freshness +
    source +
    regional +
    breaking +
    image +
    live
  );
}

export function rankArticles(articles: NewsArticleRow[]): RankedArticle[] {
  return articles
    .map((article) => {
      const regionalBoost = regionalBoostScore(article);
      const isBreaking = breakingBoostScore(article) > 0;
      return {
        ...article,
        rankScore: computeRankScore(article),
        isLive: isArticleLive(article.published_at),
        isBreaking,
        regionalBoost,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

export function extractTopicTrends(
  articles: NewsArticleRow[],
  maxTopics = 8
): TopicTrend[] {
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  const recent = articles.filter((a) => {
    if (!a.published_at) return false;
    return new Date(a.published_at).getTime() >= cutoff;
  });

  const counts = new Map<string, { count: number; article: NewsArticleRow }>();

  for (const article of recent) {
    const words = article.title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));

    const seen = new Set<string>();
    for (const word of words.slice(0, 6)) {
      if (seen.has(word)) continue;
      seen.add(word);
      const prev = counts.get(word);
      if (!prev) {
        counts.set(word, { count: 1, article });
      } else {
        prev.count += 1;
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxTopics)
    .map(([topic, { count, article }]) => ({
      topic,
      count,
      articleId: article.id,
      title: article.title,
    }));
}

function pickUnique(
  ranked: RankedArticle[],
  limit: number,
  used: Set<string>
): RankedArticle[] {
  const out: RankedArticle[] = [];
  for (const a of ranked) {
    if (used.has(a.id)) continue;
    used.add(a.id);
    out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}

export function buildHomepageFeed(articles: NewsArticleRow[]): LiveNewsFeed | null {
  const pool = articles.filter((a) => a.title?.trim());
  if (!pool.length) return null;

  const ranked = rankArticles(pool);
  const used = new Set<string>();

  const hero = pickUnique(ranked, 1, used)[0] ?? ranked[0] ?? null;

  const justIn = pickUnique(
    ranked.filter(
      (a) =>
        a.region === "chhattisgarh" ||
        a.regionalBoost >= 35 ||
        a.category === "local"
    ),
    10,
    used
  );

  const topicTrends = extractTopicTrends(pool);
  const trendingFromTopics = topicTrends
    .map((t) => ranked.find((a) => a.id === t.articleId))
    .filter((a): a is RankedArticle => Boolean(a))
    .slice(0, 6);

  const trending =
    trendingFromTopics.length > 0
      ? trendingFromTopics
      : pickUnique(ranked, 6, used);

  for (const a of trending) used.add(a.id);

  const byCategory = NEWS_INGEST_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = pickUnique(
        ranked.filter((a) => a.category === cat),
        4,
        new Set()
      );
      return acc;
    },
    {} as Record<NewsCategory, RankedArticle[]>
  );

  const latest = pickUnique(ranked, 12, used);

  const regionalCount = pool.filter(
    (a) => a.region === "chhattisgarh" || regionalBoostScore(a) >= 35
  ).length;

  const sourceMix: Record<string, number> = {};
  for (const a of pool) {
    const key = resolveArticleProvider(a) ?? "unknown";
    sourceMix[key] = (sourceMix[key] ?? 0) + 1;
  }

  const liveCount = pool.filter((a) => isArticleLive(a.published_at)).length;

  return {
    hero,
    trending,
    justIn,
    topicTrends,
    byCategory,
    latest,
    fetchedAt: new Date().toISOString(),
    analytics: {
      homepage_source_mix: sourceMix,
      regional_percentage: Math.round((regionalCount / pool.length) * 100),
      live_articles_count: liveCount,
    },
  };
}
