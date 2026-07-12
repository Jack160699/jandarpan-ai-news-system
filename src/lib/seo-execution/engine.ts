/**
 * SEO Execution Engine — audit orchestrator
 */

import { auditArticle } from "@/lib/seo-execution/article-audit";
import { generateTitleSuggestions } from "@/lib/seo-execution/title-optimizer";
import { generateMetaSuggestions } from "@/lib/seo-execution/meta-optimizer";
import { generateInternalLinkSuggestions } from "@/lib/seo-execution/internal-link-engine";
import { generateFaqSuggestions } from "@/lib/seo-execution/faq-generator";
import { generateExpansionSuggestions } from "@/lib/seo-execution/article-expansion";
import { generateImageSeoSuggestions } from "@/lib/seo-execution/image-seo";
import {
  loadArticleById,
  loadIntelligenceContext,
  loadRelatedArticles,
} from "@/lib/seo-execution/data-loader";
import { isSeoExecutionEngineEnabled } from "@/lib/seo-execution/config";
import { logExecution, errorExecution } from "@/lib/seo-execution/logger";
import {
  completeJob,
  createJob,
  insertSuggestions,
} from "@/lib/seo-execution/repository";
import type { AuditResult } from "@/lib/seo-execution/types";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function runArticleSeoAudit(
  articleId: string,
  triggeredBy?: string
): Promise<AuditResult> {
  if (!isSeoExecutionEngineEnabled()) {
    return {
      ok: false,
      suggestionCount: 0,
      errors: ["SEO_EXECUTION_ENGINE_not_enabled"],
    };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, suggestionCount: 0, errors: ["supabase_not_configured"] };
  }

  logExecution("audit_started", { articleId, triggeredBy });

  try {
    const article = await loadArticleById(articleId);
    if (!article) {
      return { ok: false, suggestionCount: 0, errors: ["article_not_found"] };
    }

    const [context, related] = await Promise.all([
      loadIntelligenceContext(article),
      loadRelatedArticles(article),
    ]);

    const auditScores = auditArticle(article, context);
    const jobId = await createJob({
      articleId: article.id,
      articleSlug: article.slug,
      auditScores,
      triggeredBy,
    });

    const drafts = [
      ...generateTitleSuggestions(article),
      ...generateMetaSuggestions(article),
      ...generateInternalLinkSuggestions(article, related),
      ...generateFaqSuggestions(article),
      ...generateExpansionSuggestions(article, context),
      ...generateImageSeoSuggestions(article),
    ];

    const suggestionCount = await insertSuggestions(jobId, article.id, drafts);
    await completeJob(jobId, "completed");

    logExecution("audit_completed", { articleId, jobId, suggestionCount });
    logExecution("suggestion_generated", { count: suggestionCount });

    return {
      ok: true,
      jobId,
      suggestionCount,
      audit: auditScores,
      errors: [],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "audit_failed";
    errorExecution("audit_completed", { articleId, error: msg });
    return { ok: false, suggestionCount: 0, errors: [msg] };
  }
}
