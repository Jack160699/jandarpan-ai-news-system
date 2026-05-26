import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { PlatformArticle } from "../content/types";
import { platformCategoryFromIngest } from "./category-bridge";

type NewsArticleRow = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  source: string | null;
  category: string | null;
  article_url: string | null;
  published_at: string | null;
  created_at: string;
  language: string | null;
  region: string | null;
};

export async function queryNewsArticlesAsPlatform(filters: {
  categories: string[];
  limit?: number;
  offset?: number;
}): Promise<PlatformArticle[]> {
  if (!isSupabaseConfigured() || !filters.categories.length) return [];

  const supabase = createAdminServerClient();
  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;

  const { data, error } = await supabase
    .from("news_articles")
    .select(
      "id, slug, title, description, content, image_url, source, category, article_url, published_at, created_at, language, region"
    )
    .in("category", filters.categories)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.warn("[platform] queryNewsArticlesAsPlatform:", error.message);
    return [];
  }

  return ((data ?? []) as NewsArticleRow[]).map((row) => {
    const ingestCategory = row.category ?? "local";
    const platformCategory = platformCategoryFromIngest(ingestCategory);

    return {
      id: row.id,
      slug: row.slug ?? row.id,
      title: row.title,
      excerpt: row.description ?? "",
      content: row.content ?? row.description ?? "",
      image: row.image_url ?? "",
      category: platformCategory,
      tags: [ingestCategory],
      district: /raipur/i.test(`${row.title} ${row.region ?? ""}`) ? "raipur" : null,
      language: (row.language as PlatformArticle["language"]) ?? "hi",
      source: row.source ?? "Wire",
      publishedAt: row.published_at ?? row.created_at,
      priority: 45,
      breaking: ingestCategory === "breaking_news",
      seo: {
        title: row.title,
        description: row.description ?? "",
        keywords: [ingestCategory],
      },
      aiSummary: null,
      views: 0,
      trendingScore: 40,
    } satisfies PlatformArticle;
  });
}
