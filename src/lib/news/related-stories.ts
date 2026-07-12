/**
 * Related stories — category, region, keywords, trending overlap
 */

import { resolveArticleProvider } from "@/lib/news/article-provider";
import { regionalBoostScore } from "@/lib/news/home-ranking";
import { normalizeTitle, titleHash, titleSimilarity } from "@/lib/news/normalize";
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
  if (resolveArticleProvider(source) === resolveArticleProvider(candidate)) score += 10;

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
    else if (ageH < 12) score += 10;
    else if (ageH < 24) score += 8;
  }

  return score;
}

export function pickRelatedStories(
  source: NewsArticleRow,
  pool: NewsArticleRow[],
  limit = 6,
  knowledgeBoost?: (source: NewsArticleRow, candidate: NewsArticleRow) => number
): NewsArticleRow[] {
  const seenTitles = new Set<string>();
  const sourceNorm = normalizeTitle(source.title ?? "");

  return pool
    .map((c) => ({
      article: c,
      score:
        scoreRelatedness(source, c) +
        (knowledgeBoost ? knowledgeBoost(source, c) : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter(({ article }) => {
      if (article.id === source.id) return false;

      const th = titleHash(article.title);
      if (seenTitles.has(th)) return false;

      const norm = normalizeTitle(article.title ?? "");
      if (norm && sourceNorm && norm === sourceNorm) return false;
      if (titleSimilarity(source.title ?? "", article.title ?? "") >= 0.78) {
        return false;
      }

      const sourceEvent = source.event_id;
      const candidateEvent = article.event_id;
      if (
        sourceEvent &&
        candidateEvent &&
        sourceEvent === candidateEvent
      ) {
        return false;
      }

      seenTitles.add(th);
      return true;
    })
    .slice(0, limit)
    .map((x) => x.article);
}

export function resolveStorySlug(article: NewsArticleRow): string {
  return article.slug ?? buildArticleSlug(article.title, article.id, article.article_url);
}
