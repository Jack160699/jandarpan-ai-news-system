/**
 * Related stories — category, region, keywords, trending overlap
 */

import { regionalBoostScore } from "@/lib/news/home-ranking";
import { titleHash } from "@/lib/news/normalize";
import { buildArticleSlug } from "@/lib/news/slug";
import type { NewsArticleRow } from "@/lib/types/news-article";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function overlapScore(a: string[], b: string[]): number {
  const setB = new Set(b);
  let n = 0;
  for (const w of a) {
    if (setB.has(w)) n++;
  }
  return n;
}

export function scoreRelatedness(
  source: NewsArticleRow,
  candidate: NewsArticleRow
): number {
  if (source.id === candidate.id) return -1;

  let score = 0;

  if (source.category === candidate.category) score += 40;
  if (source.region === candidate.region) score += 30;
  if (source.provider === candidate.provider) score += 10;

  const regional = regionalBoostScore(candidate);
  if (regional >= 35) score += 20;

  const tokensA = tokenize(`${source.title} ${source.description ?? ""}`);
  const tokensB = tokenize(`${candidate.title} ${candidate.description ?? ""}`);
  score += overlapScore(tokensA, tokensB) * 8;

  if (source.published_at && candidate.published_at) {
    const ageH =
      Math.abs(
        new Date(source.published_at).getTime() -
          new Date(candidate.published_at).getTime()
      ) / 3_600_000;
    if (ageH < 6) score += 15;
    if (ageH < 24) score += 8;
  }

  return score;
}

export function pickRelatedStories(
  source: NewsArticleRow,
  pool: NewsArticleRow[],
  limit = 6
): NewsArticleRow[] {
  const seenTitles = new Set<string>();

  return pool
    .map((c) => ({ article: c, score: scoreRelatedness(source, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter(({ article }) => {
      const th = titleHash(article.title);
      if (seenTitles.has(th)) return false;
      seenTitles.add(th);
      return true;
    })
    .slice(0, limit)
    .map((x) => x.article);
}

export function resolveStorySlug(article: NewsArticleRow): string {
  return article.slug ?? buildArticleSlug(article.title, article.id, article.article_url);
}
