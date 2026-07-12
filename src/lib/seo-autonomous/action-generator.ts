/**
 * Stage 3 — Generate Actions from analysis opportunities
 */

import { auditArticle } from "@/lib/seo-execution/article-audit";
import { generateTitleSuggestions } from "@/lib/seo-execution/title-optimizer";
import { generateMetaSuggestions } from "@/lib/seo-execution/meta-optimizer";
import { generateInternalLinkSuggestions } from "@/lib/seo-execution/internal-link-engine";
import { generateFaqSuggestions } from "@/lib/seo-execution/faq-generator";
import { generateImageSeoSuggestions } from "@/lib/seo-execution/image-seo";
import {
  loadArticleById,
  loadIntelligenceContext,
  loadRelatedArticles,
} from "@/lib/seo-execution/data-loader";
import { createJob, insertSuggestions, completeJob } from "@/lib/seo-execution/repository";
import { getLearningConfidenceBoost } from "@/lib/seo-autonomous/learning";
import { AUTONOMOUS_MAX_ACTIONS } from "@/lib/seo-autonomous/config";
import type { AnalysisOpportunity, SeoActionDraft } from "@/lib/seo-autonomous/types";
import type { SuggestionDraft } from "@/lib/seo-execution/types";
import { logAutonomous } from "@/lib/seo-autonomous/logger";

function draftToAction(
  articleId: string,
  articleSlug: string,
  draft: SuggestionDraft,
  confidenceBoost: number
): SeoActionDraft {
  const key = `${articleId}:${draft.field_key}:${draft.suggestion_type}`;
  return {
    external_key: key,
    action_type: draft.suggestion_type,
    article_id: articleId,
    article_slug: articleSlug,
    field_key: draft.field_key,
    current_value: draft.current_value,
    suggested_value: draft.suggested_value,
    reason: draft.reason,
    confidence: Math.min(draft.confidence + confidenceBoost, 0.99),
    expected_impact: draft.expected_impact,
    rollback_strategy: "snapshot_restore",
    metadata: draft.metadata,
  };
}

export async function generateActions(
  opportunities: AnalysisOpportunity[]
): Promise<SeoActionDraft[]> {
  const actions: SeoActionDraft[] = [];

  for (const opp of opportunities) {
    if (actions.length >= AUTONOMOUS_MAX_ACTIONS) break;

    try {
      const article = await loadArticleById(opp.article_id);
      if (!article) continue;

      const [context, related] = await Promise.all([
        loadIntelligenceContext(article),
        loadRelatedArticles(article),
      ]);

      const auditScores = auditArticle(article, context);
      const jobId = await createJob({
        articleId: article.id,
        articleSlug: article.slug,
        auditScores,
        triggeredBy: "seo-autonomous-engine",
      });

      const drafts: SuggestionDraft[] = [
        ...generateTitleSuggestions(article),
        ...generateMetaSuggestions(article),
        ...generateInternalLinkSuggestions(article, related),
        ...generateFaqSuggestions(article),
        ...generateImageSeoSuggestions(article),
      ];

      await insertSuggestions(jobId, article.id, drafts);
      await completeJob(jobId, "completed");

      for (const draft of drafts) {
        const boost = await getLearningConfidenceBoost(
          draft.suggestion_type,
          draft.field_key
        );
        const action = draftToAction(article.id, article.slug, draft, boost);
        action.metadata = { ...action.metadata, job_id: jobId };
        actions.push(action);
      }
    } catch (err) {
      logAutonomous("generate_action_error", {
        articleId: opp.article_id,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  logAutonomous("generate_complete", { count: actions.length });
  return actions.slice(0, AUTONOMOUS_MAX_ACTIONS);
}
