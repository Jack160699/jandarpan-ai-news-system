/**
 * Read-only intelligence + article loader for SEO execution
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { PUBLIC_EDITORIAL_STATUSES } from "@/lib/newsroom/publish-state";
import { detectDistrictInText } from "@/lib/seo-intelligence/text-utils";
import type {
  ExecutionArticle,
  IntelligenceContext,
} from "@/lib/seo-execution/types";

function mapArticle(row: Record<string, unknown>): ExecutionArticle {
  const geo = (row.geo_metadata as Record<string, unknown> | null) ?? {};
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
  const body = (row.article_body as string | null) ?? "";
  const district =
    (geo.primary_district as string | undefined) ??
    detectDistrictInText(`${row.headline ?? ""} ${row.summary ?? ""}`);

  return {
    id: String(row.id),
    slug: String(row.slug),
    headline: String(row.headline),
    summary: (row.summary as string | null) ?? null,
    seo_title: (row.seo_title as string | null) ?? null,
    seo_description: (row.seo_description as string | null) ?? null,
    article_body: body || null,
    hero_image_url: (row.hero_image_url as string | null) ?? null,
    tags,
    district: district ?? null,
    category: tags[0] ?? null,
    published_at: (row.published_at as string | null) ?? null,
    editorial_metadata:
      (row.editorial_metadata as Record<string, unknown>) ?? {},
    word_count: body ? body.split(/\s+/).filter(Boolean).length : 0,
  };
}

export async function loadArticleById(
  articleId: string
): Promise<ExecutionArticle | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await createAdminServerClient()
    .from("generated_articles")
    .select(
      "id,slug,headline,summary,seo_title,seo_description,article_body,hero_image_url,tags,published_at,geo_metadata,editorial_metadata"
    )
    .eq("id", articleId)
    .maybeSingle();

  if (error || !data) return null;
  return mapArticle(data as Record<string, unknown>);
}

export async function loadRecentArticles(
  limit = 50
): Promise<ExecutionArticle[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await createAdminServerClient()
    .from("generated_articles")
    .select(
      "id,slug,headline,summary,seo_title,seo_description,article_body,hero_image_url,tags,published_at,geo_metadata,editorial_metadata"
    )
    .not("published_at", "is", null)
    .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => mapArticle(row as Record<string, unknown>));
}

export async function loadIntelligenceContext(
  article: ExecutionArticle
): Promise<IntelligenceContext> {
  if (!isSupabaseConfigured()) {
    return {
      competitorHeadlines: [],
      seoGaps: [],
      serpOpportunities: [],
      gscQueries: [],
    };
  }

  const supabase = createAdminServerClient();
  const district = article.district ?? "";
  const headlineTerms = article.headline.split(/\s+/).slice(0, 3).join(" ");

  const [competitorRes, gapRes, serpRes, gscRes] = await Promise.all([
    supabase
      .from("competitor_articles" as never)
      .select("title")
      .ilike("title", `%${district || headlineTerms}%`)
      .limit(10),
    supabase
      .from("seo_gap_reports" as never)
      .select("reason, keyword")
      .or(`district.eq.${district},keyword.ilike.%${headlineTerms}%`)
      .limit(10),
    supabase
      .from("serp_opportunities" as never)
      .select("title, reason")
      .eq("status", "open")
      .limit(10),
    supabase
      .from("gsc_queries" as never)
      .select("query, clicks, position")
      .or(`district.eq.${district},query.ilike.%${district}%`)
      .order("clicks", { ascending: false })
      .limit(10),
  ]);

  return {
    competitorHeadlines: ((competitorRes.data ?? []) as Array<{ title: string }>).map(
      (r) => r.title
    ),
    seoGaps: ((gapRes.data ?? []) as Array<{ reason: string; keyword?: string }>).map(
      (r) => r.keyword ? `${r.keyword}: ${r.reason}` : r.reason
    ),
    serpOpportunities: ((serpRes.data ?? []) as Array<{ title: string; reason: string }>).map(
      (r) => `${r.title} — ${r.reason}`
    ),
    gscQueries: ((gscRes.data ?? []) as Array<{
      query: string;
      clicks: number;
      position: number;
    }>).map((r) => ({
      query: r.query,
      clicks: Number(r.clicks),
      position: Number(r.position),
    })),
  };
}

export async function loadRelatedArticles(
  article: ExecutionArticle,
  limit = 8
): Promise<ExecutionArticle[]> {
  if (!isSupabaseConfigured()) return [];

  let query = createAdminServerClient()
    .from("generated_articles")
    .select(
      "id,slug,headline,summary,seo_title,seo_description,article_body,hero_image_url,tags,published_at,geo_metadata,editorial_metadata"
    )
    .not("published_at", "is", null)
    .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (article.district) {
    query = query.contains("tags", [article.district]);
  }

  const { data } = await query;
  return (data ?? []).map((row) => mapArticle(row as Record<string, unknown>));
}
