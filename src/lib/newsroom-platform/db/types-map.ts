import type { PlatformArticle } from "../content/types";
import type { ArticleRow } from "./types";

export function articleRowToPlatform(row: ArticleRow): PlatformArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    content: row.content ?? "",
    image: row.image_url ?? "",
    category: row.category as PlatformArticle["category"],
    tags: row.tags ?? [],
    district: row.district_slug,
    language: row.language as PlatformArticle["language"],
    source: row.source_name ?? "Desk",
    publishedAt: row.published_at,
    priority: row.priority,
    breaking: row.is_breaking,
    seo: {
      title: row.seo_title ?? row.title,
      description: row.seo_description ?? "",
      keywords: row.seo_keywords ?? [],
    },
    aiSummary: row.ai_summary,
    views: row.views,
    trendingScore: row.trending_score,
  };
}
