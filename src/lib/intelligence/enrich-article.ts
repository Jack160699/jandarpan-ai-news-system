/**
 * Persist intelligence summary on generated_articles.editorial_metadata
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { scoreFakeNewsRisk } from "@/lib/intelligence/fake-news-risk";
import { buildAutomatedSummary } from "@/lib/intelligence/summaries";
import { analyzeEditorialIntelligence } from "@/lib/news/ai/editorial-intelligence";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export async function enrichArticleIntelligence(
  articleId: string,
  options?: { existingHeadlines?: string[] }
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "no_database" };
  }

  const supabase = createAdminServerClient();
  const { data: row, error } = await supabase
    .from("generated_articles")
    .select("*")
    .eq("id", articleId)
    .maybeSingle();

  if (error || !row) return { ok: false, error: error?.message ?? "not_found" };

  const article = row as GeneratedArticleRow;
  const meta = (article.editorial_metadata ?? {}) as Record<string, unknown>;
  const attr =
    (meta.source_attribution as Array<{
      source: string | null;
      provider: string;
      confidence: number;
    }>) ?? [];

  const intelligence = analyzeEditorialIntelligence(
    {
      headline: article.headline,
      summary: article.summary ?? "",
      articleBody: article.article_body ?? "",
      seoTitle: article.seo_title ?? article.headline,
      seoDescription: article.seo_description ?? article.summary ?? "",
      sourceTexts: [],
      factPackText: "",
      sourceCount: attr.length,
      language: article.language ?? "hi",
      existingHeadlines: options?.existingHeadlines ?? [],
    },
    {
      sourceOverlap: (meta.quality_breakdown as { sourceOverlap?: number })?.sourceOverlap,
    }
  );

  const fakeNewsRisk = scoreFakeNewsRisk({
    headline: article.headline,
    summary: article.summary ?? "",
    articleBody: article.article_body ?? "",
    sourceCount: attr.length,
    aiConfidence: intelligence.confidence,
    spamScore: intelligence.spamScore,
    duplicateSimilarity: intelligence.duplicateCluster?.similarity,
  });

  const deskSummary = buildAutomatedSummary({
    headline: article.headline,
    summary: article.summary,
    articleBody: article.article_body,
  });

  const patch = {
    ...meta,
    ai_confidence: intelligence.confidence,
    quality_breakdown: intelligence.quality_breakdown,
    intelligence_v1: {
      enrichedAt: new Date().toISOString(),
      fakeNewsRisk,
      duplicateClusterId: intelligence.duplicateCluster?.clusterId ?? null,
      deskSummary,
      breakingScore: intelligence.breakingScore,
      trendScore: intelligence.trendScore,
      checks_run: intelligence.checks_run,
    },
  };

  const { error: updateError } = await supabase
    .from("generated_articles")
    .update({ editorial_metadata: patch })
    .eq("id", articleId);

  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true };
}
