/**
 * Map wire API articles into generated_articles shape for homepage builder.
 */

import { buildArticleSlug } from "@/lib/news/slug";
import type { NormalizedArticle } from "@/lib/news/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import { createHash } from "crypto";

function stableId(article: NormalizedArticle): string {
  const hash = createHash("sha256")
    .update(article.article_url)
    .digest("hex")
    .slice(0, 12);
  return `wire-${article.provider}-${hash}`;
}

export function wireArticleToGeneratedRow(
  article: NormalizedArticle
): GeneratedArticleRow {
  const id = stableId(article);
  const slug = buildArticleSlug(article.title, id, article.article_url);
  const published = article.published_at ?? new Date().toISOString();
  const isCg =
    article.region === "india" &&
    /chhattisgarh|raipur|bilaspur|bastar|durg|cg/i.test(
      `${article.title} ${article.description ?? ""}`
    );

  return {
    id,
    event_id: null,
    slug,
    headline: article.title,
    summary: article.description?.trim() || article.title,
    article_body: article.content?.trim() || article.description?.trim() || null,
    hero_image_url: article.image_url,
    seo_title: article.title,
    seo_description: article.description?.trim() || null,
    reading_time: "3",
    language: article.language ?? "hi",
    tags: [isCg ? "chhattisgarh" : article.category || "india"],
    published_at: published,
    editorial_status: "approved",
    homepage_pin: false,
    pinned_at: null,
    editorial_metadata: {
      ai_confidence: 0.38,
      used_fallback: false,
      source_count: 1,
      source_attribution: [
        {
          signal_id: id,
          provider: article.provider,
          source: article.source ?? article.provider,
          article_url: article.article_url,
          published_at: published,
          confidence: 0.38,
        },
      ],
      is_breaking: Date.now() - new Date(published).getTime() < 3 * 3_600_000,
    },
    created_at: published,
  };
}

export function wireArticlesToGeneratedPool(
  articles: NormalizedArticle[],
  limit = 80
): GeneratedArticleRow[] {
  const seen = new Set<string>();
  const rows: GeneratedArticleRow[] = [];

  for (const article of articles) {
    const key = article.article_url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(wireArticleToGeneratedRow(article));
    if (rows.length >= limit) break;
  }

  return rows;
}
