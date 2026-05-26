import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { PlatformArticle } from "../content/types";
import { articleRowToPlatform } from "./types-map";
import type { ArticleRow } from "./types";

/**
 * Query platform_articles from Supabase.
 */
export async function queryArticles(filters: {
  category?: string;
  district?: string;
  limit?: number;
  offset?: number;
  breaking?: boolean;
}): Promise<ArticleRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  let q = supabase
    .from("platform_articles")
    .select("*")
    .order("published_at", { ascending: false });

  if (filters.category) q = q.eq("category", filters.category);
  if (filters.district) q = q.eq("district_slug", filters.district);
  if (filters.breaking) q = q.eq("is_breaking", true);

  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) {
    console.error("[platform] queryArticles:", error.message);
    return [];
  }

  return (data ?? []) as ArticleRow[];
}

export async function queryGeneratedAsPlatform(filters: {
  district?: string;
  limit?: number;
  offset?: number;
}): Promise<PlatformArticle[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  let q = supabase
    .from("generated_articles")
    .select(
      "id, slug, headline, summary, article_body, hero_image_url, seo_title, seo_description, language, tags, published_at, editorial_metadata, geo_metadata, created_at"
    )
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) return [];

  const { geoFromRecord } = await import("@/lib/regional/geo-tagging");

  return (data ?? [])
    .map((row) => {
      const geo = geoFromRecord(row);
      const districtSlug = geo.districts[0] ?? null;
      if (filters.district && districtSlug !== filters.district) return null;

      const meta = (row.editorial_metadata ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        slug: row.slug,
        title: row.headline,
        excerpt: row.summary ?? "",
        content: row.article_body ?? "",
        image: row.hero_image_url ?? "",
        category: (meta.category as PlatformArticle["category"]) ?? "district_news",
        tags: row.tags ?? [],
        district: districtSlug,
        language: (row.language as PlatformArticle["language"]) ?? "hi",
        source: "Jan Darpan Desk",
        publishedAt: row.published_at ?? row.created_at,
        priority: 50,
        breaking: Boolean(meta.is_breaking),
        seo: {
          title: row.seo_title ?? row.headline,
          description: row.seo_description ?? "",
          keywords: [],
        },
        aiSummary: (meta.ai_summary as string) ?? null,
        views: 0,
        trendingScore: (meta.trend_score as number) ?? 0,
      } satisfies PlatformArticle;
    })
    .filter((a): a is PlatformArticle => a !== null);
}

export { articleRowToPlatform } from "./types-map";
