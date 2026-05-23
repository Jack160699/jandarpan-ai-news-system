/**
 * Trending keyword extraction — homepage SEO + Google News news_keywords
 */

import { getTrendingSearches } from "@/lib/search/trending-queries";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";

const STOP = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "that",
  "this",
  "news",
  "latest",
  "today",
  "की",
  "के",
  "में",
  "से",
  "और",
  "पर",
]);

function tokenizeHeadline(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

export function extractTrendingKeywordsFromArticles(
  articles: Array<{ headline?: string; title?: string; tags?: string[] }>,
  limit = 12
): string[] {
  const freq = new Map<string, number>();

  for (const a of articles) {
    const headline = a.headline ?? a.title ?? "";
    for (const token of tokenizeHeadline(headline)) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
    for (const tag of a.tags ?? []) {
      const t = tag.trim().toLowerCase();
      if (t.length > 3) freq.set(t, (freq.get(t) ?? 0) + 2);
    }
  }

  const fromHeadlines = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);

  return fromHeadlines;
}

export function buildTrendingKeywords(input?: {
  generatedRows?: GeneratedArticleRow[];
  liveArticles?: NewsArticleRow[];
  limit?: number;
}): string[] {
  const limit = input?.limit ?? 10;
  const pool: Array<{ headline?: string; title?: string; tags?: string[] }> = [
    ...(input?.generatedRows?.map((r) => ({
      headline: r.headline,
      tags: r.tags,
    })) ?? []),
    ...(input?.liveArticles?.map((r) => ({
      title: r.title,
      tags: [r.category],
    })) ?? []),
  ];

  const extracted = pool.length
    ? extractTrendingKeywordsFromArticles(pool, limit)
    : [];

  const merged = [
    ...getTrendingSearches(limit),
    ...extracted,
    "Chhattisgarh news",
    "Raipur news",
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of merged) {
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
    if (out.length >= limit) break;
  }
  return out;
}

export function newsKeywordsForArticle(input: {
  headline: string;
  category: string;
  region?: string | null;
  tags?: string[];
  trendingPool?: string[];
}): string[] {
  const base = [
    input.category,
    input.region ?? "chhattisgarh",
    "Chhattisgarh",
    ...(input.tags ?? []).slice(0, 4),
    ...(input.trendingPool ?? []).slice(0, 3),
  ];
  const headlineTokens = tokenizeHeadline(input.headline).slice(0, 4);
  return [...new Set([...base, ...headlineTokens])].slice(0, 10);
}
