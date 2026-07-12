/**
 * Competitor Intelligence — article fingerprint for change detection
 */

import type { ParsedCompetitorArticle } from "@/lib/competitor-intelligence/types";

export function normalizeCompetitorUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function articleContentFingerprint(
  article: Pick<
    ParsedCompetitorArticle,
    | "title"
    | "description"
    | "category"
    | "district"
    | "author"
    | "publishedAt"
    | "image"
    | "wordCount"
    | "headings"
    | "canonical"
  >
): string {
  return JSON.stringify({
    title: article.title?.trim() ?? "",
    description: article.description?.trim() ?? "",
    category: article.category?.trim() ?? "",
    district: article.district?.trim() ?? "",
    author: article.author?.trim() ?? "",
    publishedAt: article.publishedAt ?? "",
    image: article.image?.trim() ?? "",
    wordCount: article.wordCount ?? null,
    headings: article.headings ?? [],
    canonical: article.canonical?.trim() ?? "",
  });
}

export function dedupeParsedArticles(
  articles: ParsedCompetitorArticle[]
): ParsedCompetitorArticle[] {
  const seen = new Set<string>();
  const out: ParsedCompetitorArticle[] = [];

  for (const article of articles) {
    const url = normalizeCompetitorUrl(article.url);
    if (!url || !article.title?.trim()) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ ...article, url });
  }

  return out;
}

export function hasArticleChanged(
  existing: {
    title: string;
    description: string | null;
    category: string | null;
    district: string | null;
    author: string | null;
    published_at: string | null;
    image: string | null;
    word_count: number | null;
    headings: string[] | null;
    canonical: string | null;
  },
  incoming: ParsedCompetitorArticle
): boolean {
  const prev = articleContentFingerprint({
    title: existing.title,
    description: existing.description,
    category: existing.category,
    district: existing.district,
    author: existing.author,
    publishedAt: existing.published_at,
    image: existing.image,
    wordCount: existing.word_count,
    headings: existing.headings ?? [],
    canonical: existing.canonical,
  });

  const next = articleContentFingerprint(incoming);
  return prev !== next;
}
