/**
 * Map generated_articles → news_articles shape for story page compatibility
 */

import { buildArticleSlug } from "@/lib/news/slug";
import { inferSection } from "@/lib/homepage/infer-section";
import { resolveEditorialDesk } from "@/lib/newsroom/desk-branding";
import { resolveGeneratedArticleModifiedAt } from "@/lib/seo/article-dates";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

/** In-memory-only id for generated rows mapped into NewsArticleRow (never a DB news_articles key). */
function syntheticNewsArticleId(generatedId: string): number {
  let hash = 0;
  for (let i = 0; i < generatedId.length; i++) {
    hash = (Math.imul(31, hash) + generatedId.charCodeAt(i)) | 0;
  }
  return -Math.max(1, Math.abs(hash));
}

const SECTION_TO_CATEGORY: Record<string, NewsCategory> = {
  chhattisgarh: "local",
  raipur: "local",
  india: "politics",
  world: "world",
  business: "business",
  sports: "sports",
  education: "health",
};

export function generatedToNewsArticle(
  row: GeneratedArticleRow
): NewsArticleRow {
  const section = inferSection(row);
  const category = (SECTION_TO_CATEGORY[section] ?? "local") as NewsCategory;
  const desk = resolveEditorialDesk(
    section,
    section === "chhattisgarh" || section === "raipur"
  );

  return {
    id: syntheticNewsArticleId(row.id),
    title: row.headline,
    description: row.summary,
    content: row.article_body,
    image_url: row.hero_image_url,
    source: desk.name,
    author: "Editorial Desk",
    category,
    article_url: `/story/${row.slug}`,
    slug: row.slug ?? buildArticleSlug(row.headline, row.id),
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: resolveGeneratedArticleModifiedAt(row) ?? row.created_at,
    provider: "editorial",
    language: row.language,
    region: section === "chhattisgarh" || section === "raipur" ? "chhattisgarh" : "india",
    title_hash: null,
    url_hash: null,
    ai_summary: row.summary,
    ai_headline: row.headline,
    ai_processed_at: row.created_at,
    event_id: row.event_id ?? null,
  };
}
