/**
 * Map generated_articles → news_articles shape for story page compatibility
 */

import { buildArticleSlug } from "@/lib/news/slug";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";
import { inferSection } from "@/lib/homepage/generated-feed";

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

  return {
    id: row.id,
    title: row.headline,
    description: row.summary,
    content: row.article_body,
    image_url: row.hero_image_url,
    source: "CG Bhaskar Editorial",
    author: "Editorial Desk",
    category,
    article_url: `/story/${row.slug}`,
    slug: row.slug ?? buildArticleSlug(row.headline, row.id),
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.created_at,
    provider: "editorial",
    language: row.language,
    region: section === "chhattisgarh" || section === "raipur" ? "chhattisgarh" : "india",
    title_hash: null,
    url_hash: null,
    ai_summary: row.summary,
    ai_headline: row.headline,
    ai_processed_at: row.created_at,
  };
}
