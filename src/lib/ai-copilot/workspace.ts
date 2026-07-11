/**
 * Module 5 — Editor Workspace (unified article context)
 */

import { loadArticleById } from "@/lib/seo-execution/data-loader";
import { loadIntelligenceContext } from "@/lib/seo-execution/data-loader";
import { auditArticle } from "@/lib/seo-execution/article-audit";
import { getExecutionDashboard } from "@/lib/seo-execution/repository";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { SITE_URL } from "@/lib/seo/constants";
import type { ArticleWorkspace } from "@/lib/ai-copilot/types";

export async function buildArticleWorkspace(
  articleId: string
): Promise<ArticleWorkspace | null> {
  const article = await loadArticleById(articleId);
  if (!article) return null;

  const [context, execution] = await Promise.all([
    loadIntelligenceContext({
      id: article.id,
      slug: article.slug,
      headline: article.headline,
      summary: article.summary,
      seo_title: article.seo_title,
      seo_description: article.seo_description,
      article_body: article.article_body,
      hero_image_url: article.hero_image_url,
      tags: article.tags,
      district: article.district,
      category: article.category,
      published_at: article.published_at,
      editorial_metadata: article.editorial_metadata,
      word_count: article.word_count,
    }),
    getExecutionDashboard().catch(() => null),
  ]);

  const audit = auditArticle(
    {
      id: article.id,
      slug: article.slug,
      headline: article.headline,
      summary: article.summary,
      seo_title: article.seo_title,
      seo_description: article.seo_description,
      article_body: article.article_body,
      hero_image_url: article.hero_image_url,
      tags: article.tags,
      district: article.district,
      category: article.category,
      published_at: article.published_at,
      editorial_metadata: article.editorial_metadata,
      word_count: article.word_count,
    },
    context
  );

  let competitors: Array<{ title: string; url: string }> = [];
  let gscMetrics: Array<{ query: string; clicks: number; position: number }> = [];
  let serpRankings: Array<{ keyword: string; position: number | null }> = [];

  if (isSupabaseConfigured()) {
    const supabase = createAdminServerClient();
    const district = article.district ?? "";

    const [compRes, gscRes, serpRes] = await Promise.all([
      supabase
        .from("competitor_articles" as never)
        .select("title, url")
        .ilike("title", `%${district || article.headline.slice(0, 20)}%`)
        .limit(5),
      supabase
        .from("gsc_queries" as never)
        .select("query, clicks, position")
        .or(`district.eq.${district},query.ilike.%${district}%`)
        .order("clicks", { ascending: false })
        .limit(5),
      supabase
        .from("serp_rankings" as never)
        .select("position, serp_keywords(keyword)")
        .eq("is_jandarpan", true)
        .limit(20),
    ]);

    competitors = ((compRes.data ?? []) as Array<{ title: string; url: string }>).map(
      (r) => ({ title: r.title, url: r.url })
    );
    gscMetrics = ((gscRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      query: String(r.query),
      clicks: Number(r.clicks),
      position: Number(r.position),
    }));
    serpRankings = ((serpRes.data ?? []) as Array<Record<string, unknown>>)
      .map((r) => {
        const kw = r.serp_keywords as { keyword?: string } | null;
        return { keyword: kw?.keyword ?? "", position: Number(r.position) };
      })
      .filter((r) => r.keyword)
      .slice(0, 8);
  }

  const pendingSuggestions =
    execution?.jobs.find((j) => j.generated_article_id === articleId)?.suggestions
      .filter((s) => s.status === "pending").length ?? 0;

  return {
    article: {
      id: article.id,
      slug: article.slug,
      headline: article.headline,
      district: article.district,
      category: article.category,
    },
    seoAudit: audit as unknown as Record<string, unknown>,
    competitors,
    gscMetrics,
    serpRankings,
    keywordGaps: context.seoGaps.slice(0, 5),
    pendingSuggestions,
    links: {
      execution: `/admin/seo/execution`,
      editor: `/admin/editor`,
      story: `${SITE_URL}/news/${article.slug}`,
    },
  };
}
