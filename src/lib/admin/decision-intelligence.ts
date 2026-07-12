/**
 * Decision Intelligence — read-only projection explaining editorial decisions.
 * Pure metadata; no AI, no queries, no network calls.
 */

import type { EventViewModel } from "@/lib/events/event-view-model";
import type { EditorArticleRecord } from "@/lib/editorial-editor/types";
import type { EditorialQualityReport } from "@/lib/news/ai/editorial-guards";
import { formatNewsDate } from "@/lib/i18n/format";
import {
  resolvePublishDecisionLabel,
  resolveWorkflowReviewStatus,
} from "@/lib/story/editorial-trust";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";

export type DecisionIntelligenceVm = {
  explanations: string[];
  hasLayer: boolean;
};

type EditorialMetadataExtras = EditorialMetadata & {
  trusted_sources?: number;
  cost_tier?: number | string;
  cost_plan?: {
    tier?: number | string;
    reason?: string;
    generateImage?: boolean;
    generateTranslation?: boolean;
    generateEmbedding?: boolean;
    generateShorts?: boolean;
    signals?: number;
  };
  desk_template?: string;
};

export type BuildDecisionIntelligenceInput = {
  article: EditorArticleRecord;
  meta: EditorialMetadata;
  generatedRow: GeneratedArticleRow;
  eventViewModel?: EventViewModel | null;
};

function pushUnique(lines: string[], line: string | null | undefined): void {
  if (!line?.trim()) return;
  if (!lines.includes(line)) lines.push(line);
}

function resolveSourceCount(meta: EditorialMetadata): number {
  if (typeof meta.source_count === "number" && meta.source_count > 0) {
    return meta.source_count;
  }
  if (Array.isArray(meta.source_attribution)) {
    return meta.source_attribution.length;
  }
  return 0;
}

function resolveQualityReport(
  meta: EditorialMetadata
): EditorialQualityReport | null {
  const report = meta.quality_report;
  if (!report || typeof report !== "object") return null;
  return report as EditorialQualityReport;
}

function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function resolveConfidenceThresholdLine(
  meta: EditorialMetadata,
  qualityReport: EditorialQualityReport | null
): string | null {
  const confidence = meta.ai_confidence;
  if (confidence == null || Number.isNaN(confidence)) return null;

  const threshold = qualityReport?.min_confidence_used;
  if (typeof threshold === "number" && confidence >= threshold) {
    return `Confidence above threshold (${formatPercent(confidence)} ≥ ${formatPercent(threshold)})`;
  }

  return null;
}

function resolveCostPlanLine(meta: EditorialMetadataExtras): string | null {
  const costPlan = meta.cost_plan;
  const tier = costPlan?.tier ?? meta.cost_tier;
  if (tier == null || `${tier}`.trim() === "") return null;

  const reason = costPlan?.reason?.trim();
  if (reason) {
    return `Cost plan tier ${tier} used (${reason})`;
  }
  return `Cost plan tier ${tier} used`;
}

function resolveModelLine(meta: EditorialMetadata): string | null {
  const model = meta.model?.trim();
  if (!model) return null;
  return `Generated with ${model}`;
}

function resolveGeneratedAtLine(meta: EditorialMetadata): string | null {
  const generatedAt = meta.generated_at?.trim();
  if (!generatedAt) return null;
  return `Generated at ${formatNewsDate(generatedAt, "en", "medium")}`;
}

export function buildDecisionIntelligence(
  input: BuildDecisionIntelligenceInput
): DecisionIntelligenceVm {
  const { article, meta, generatedRow, eventViewModel } = input;
  const metaExtras = meta as EditorialMetadataExtras;
  const qualityReport = resolveQualityReport(meta);
  const explanations: string[] = [];

  const publishDecision = meta.publish_decision?.trim().toLowerCase() ?? null;
  pushUnique(explanations, resolvePublishDecisionLabel(meta.publish_decision));

  if (publishDecision === "reject") {
    pushUnique(explanations, "Blocked by editorial quality gates");
  }

  if (qualityReport?.publish_allowed) {
    pushUnique(explanations, "Quality gates passed");
  }

  if (article.editorial_status === "approved") {
    pushUnique(explanations, "Human reviewed");
  } else if (article.editorial_status?.trim()) {
    pushUnique(
      explanations,
      `Editorial status: ${article.editorial_status.trim()}`
    );
  }

  pushUnique(explanations, resolveWorkflowReviewStatus(generatedRow));

  if (metaExtras.breaking_override) {
    pushUnique(explanations, "Breaking override applied");
  } else if (meta.is_breaking) {
    pushUnique(explanations, "Marked as breaking news");
  }

  if (meta.used_fallback) {
    pushUnique(explanations, "AI fallback used");
  }

  if (meta.repaired) {
    pushUnique(explanations, "Editorial repair performed");
  }

  const sourceCount = resolveSourceCount(meta);
  if (sourceCount > 1) {
    pushUnique(
      explanations,
      `Multi-source verification (${sourceCount} sources)`
    );
  }

  const trustedSources = metaExtras.trusted_sources;
  if (typeof trustedSources === "number" && trustedSources > 1) {
    pushUnique(
      explanations,
      `Trusted source count: ${trustedSources}`
    );
  }

  const eventId =
    article.event_id ?? meta.event_id ?? generatedRow.event_id ?? null;
  if (eventId || eventViewModel) {
    const eventTitle = eventViewModel?.canonical_title?.trim();
    if (eventTitle) {
      pushUnique(explanations, `Event-backed article (${eventTitle})`);
    } else {
      pushUnique(explanations, "Event-backed article");
    }
  }

  pushUnique(explanations, resolveConfidenceThresholdLine(meta, qualityReport));

  if (qualityReport?.strict_mode) {
    pushUnique(explanations, "Strict editorial mode applied");
  }

  if (qualityReport?.should_repair && publishDecision === "repair") {
    pushUnique(explanations, "Routed to repair by quality gates");
  }

  pushUnique(explanations, resolveModelLine(meta));
  pushUnique(explanations, resolveCostPlanLine(metaExtras));
  pushUnique(explanations, resolveGeneratedAtLine(meta));

  if (meta.rejection_reasons?.length && publishDecision === "reject") {
    for (const reason of meta.rejection_reasons) {
      pushUnique(explanations, `Rejection reason: ${reason}`);
    }
  }

  return {
    explanations,
    hasLayer: explanations.length > 0,
  };
}
