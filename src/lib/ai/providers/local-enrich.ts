/**
 * Deterministic enrichment when cloud LLM is unavailable.
 */

import type { NewsArticleRow } from "@/lib/types/news-article";

const CATEGORY_SET = new Set([
  "business",
  "technology",
  "sports",
  "entertainment",
  "health",
  "politics",
  "world",
  "local",
]);

function normalizeCategory(raw: string | null | undefined): string {
  const c = (raw ?? "local").trim().toLowerCase();
  return CATEGORY_SET.has(c) ? c : "local";
}

function trimWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function buildSummary(article: NewsArticleRow): string {
  const desc = article.description?.trim();
  if (desc && desc.length >= 40) {
    return desc.length > 320 ? `${desc.slice(0, 317)}…` : desc;
  }
  const title = article.title?.trim() || "News update";
  const source = article.source?.trim();
  if (source) {
    return `${title} — reported via ${source}.`;
  }
  return `${title} — regional news update.`;
}

export function enrichArticleLocally(article: NewsArticleRow): {
  ai_summary: string;
  ai_headline: string;
  category: string;
  source: "local";
} {
  const title = article.title?.trim() || "News update";
  const ai_headline = trimWords(
    article.ai_headline?.trim() || title,
    12
  );
  return {
    ai_summary: buildSummary(article),
    ai_headline,
    category: normalizeCategory(article.category),
    source: "local",
  };
}
