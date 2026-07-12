/**
 * Editorial Intelligence Inspector — read-only admin projection from existing metadata.
 * Client-safe: composes lightweight builders only (no story-intelligence server graph).
 */

import { inferSection } from "@/lib/homepage/infer-section";
import type { EventViewModel } from "@/lib/events/event-view-model";
import type { EditorArticleRecord } from "@/lib/editorial-editor/types";
import { readEditorialIntelligenceV2 } from "@/lib/news/ai/editorial-intelligence-v2";
import type { EditorialEntityV2 } from "@/lib/news/ai/editorial-intelligence-v2";
import { NEWS_DESKS } from "@/lib/newsroom/desk-branding";
import { buildStoryKnowledge } from "@/lib/story/story-knowledge";
import type { StoryKnowledgeVm } from "@/lib/story/story-knowledge";
import {
  buildDecisionIntelligence,
  type DecisionIntelligenceVm,
} from "@/lib/admin/decision-intelligence";
import {
  buildWorkflowIntelligence,
  type WorkflowIntelligenceVm,
} from "@/lib/admin/workflow-intelligence";
import {
  buildVersionIntelligence,
  type VersionIntelligenceVm,
} from "@/lib/admin/version-intelligence";
import {
  buildIntelligenceNavigation,
  type IntelligenceNavigationVm,
} from "@/lib/admin/intelligence-navigation";
import type {
  EditorialArticleStatus,
  EditorialMetadata,
  GeneratedArticleRow,
} from "@/lib/types/newsroom";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

export type InspectorEditorialSlice = {
  aiSummary: string | null;
  takeaways: string[];
  whyThisMatters: string | null;
  entities: EditorialEntityV2[];
  topicChips: string[];
  sourceCount: number;
  confidenceLabel: string | null;
};

export type InspectorTrustSlice = {
  trustLevel: string | null;
  editorialStatus: string | null;
  reviewStatus: string | null;
  verificationState: string | null;
  confidenceLabel: string | null;
  sourceSummaryLines: string[];
  aiDisclosureLines: string[];
  badges: string[];
  hasLayer: boolean;
};

export type InspectorGenerationVm = {
  model: string | null;
  generatedAt: string | null;
  publishDecision: string | null;
  deskTemplate: string | null;
  costTier: string | null;
  sourceCount: number | null;
  repaired: boolean;
  usedFallback: boolean;
  qualityBreakdown: Record<string, number> | null;
  rejectionReasons: string[];
};

export type EditorialIntelligenceInspectorVm = {
  hasContent: boolean;
  editorial: InspectorEditorialSlice | null;
  trust: InspectorTrustSlice | null;
  knowledge: StoryKnowledgeVm | null;
  generation: InspectorGenerationVm | null;
  event: EventViewModel | null;
  decision: DecisionIntelligenceVm | null;
  workflow: WorkflowIntelligenceVm | null;
  version: VersionIntelligenceVm | null;
  navigation: IntelligenceNavigationVm | null;
};

const SECTION_TO_CATEGORY: Record<string, NewsCategory> = {
  chhattisgarh: "local",
  raipur: "local",
  india: "politics",
  world: "world",
  business: "business",
  sports: "sports",
  education: "health",
};

function asEditorialMetadata(
  meta: EditorArticleRecord["editorial_metadata"]
): EditorialMetadata {
  return (meta ?? {}) as EditorialMetadata;
}

export function editorArticleToGeneratedRow(
  article: EditorArticleRecord
): GeneratedArticleRow {
  const meta = asEditorialMetadata(article.editorial_metadata);

  return {
    id: article.id,
    slug: article.slug,
    headline: article.headline,
    summary: article.summary,
    article_body: article.article_body,
    hero_image_url: article.hero_image_url,
    seo_title: article.seo_title,
    seo_description: article.seo_description,
    reading_time: null,
    language: article.language,
    tags: article.tags ?? [],
    published_at: article.published_at,
    editorial_status: (article.editorial_status as EditorialArticleStatus | null) ?? undefined,
    editorial_metadata: meta,
    created_at: article.created_at,
    event_id: article.event_id ?? meta.event_id ?? null,
    geo_metadata: meta.regional ?? null,
    workflow_status: article.workflow_status ?? undefined,
  } as GeneratedArticleRow & { workflow_status?: string | null };
}

function editorArticleToNewsArticle(
  article: EditorArticleRecord,
  generatedRow: GeneratedArticleRow
): NewsArticleRow {
  const section = inferSection(generatedRow);
  const category = (SECTION_TO_CATEGORY[section] ?? "local") as NewsCategory;

  return {
    id: -1,
    title: article.headline,
    description: article.summary,
    content: article.article_body,
    image_url: article.hero_image_url,
    source: "Editorial Desk",
    author: "Editorial Desk",
    category,
    article_url: `/story/${article.slug}`,
    slug: article.slug,
    published_at: article.published_at,
    created_at: article.created_at,
    updated_at: article.created_at,
    provider: "editorial",
    language: article.language,
    region: section === "chhattisgarh" || section === "raipur" ? "chhattisgarh" : "india",
    title_hash: null,
    url_hash: null,
    ai_summary: article.summary,
    ai_headline: article.headline,
    ai_processed_at: article.created_at,
    event_id: generatedRow.event_id ?? null,
  };
}

function formatConfidenceLabel(score: number | undefined): string | null {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 0.85) return "High confidence";
  if (score >= 0.65) return "Moderate confidence";
  return "Low confidence";
}

function buildInspectorEditorialSlice(
  article: EditorArticleRecord,
  meta: EditorialMetadata
): InspectorEditorialSlice | null {
  const v2 = readEditorialIntelligenceV2(meta);
  const sources = Array.isArray(meta.source_attribution)
    ? meta.source_attribution
    : [];
  const topicChips = (article.tags ?? []).filter(Boolean);
  const takeaways = v2?.takeaways ?? [];
  const entities = v2?.entities ?? [];

  const hasLayer = Boolean(
    takeaways.length ||
      v2?.why_this_matters ||
      entities.length ||
      sources.length ||
      topicChips.length
  );

  if (!hasLayer) return null;

  return {
    aiSummary: article.summary,
    takeaways,
    whyThisMatters: v2?.why_this_matters ?? null,
    entities,
    topicChips,
    sourceCount: sources.length,
    confidenceLabel: formatConfidenceLabel(meta.ai_confidence),
  };
}

function buildInspectorTrustSlice(
  meta: EditorialMetadata,
  editorialStatus: string | null
): InspectorTrustSlice | null {
  const sources = Array.isArray(meta.source_attribution)
    ? meta.source_attribution
    : [];
  const officialCount = sources.filter((source) =>
    /gov|nic|official|ministry/i.test(
      `${source.source ?? ""} ${source.article_url ?? ""}`
    )
  ).length;

  const sourceSummaryLines: string[] = [];
  const reportingCount = Math.max(sources.length - officialCount, 0);
  if (reportingCount > 0) {
    sourceSummaryLines.push(
      `${reportingCount} reporting source${reportingCount === 1 ? "" : "s"}`
    );
  }
  if (officialCount > 0) {
    sourceSummaryLines.push(
      `${officialCount} official source${officialCount === 1 ? "" : "s"}`
    );
  }

  const aiDisclosureLines: string[] = [];
  if (meta.model) {
    aiDisclosureLines.push(`Generated with ${meta.model}`);
  }
  if (meta.repaired) {
    aiDisclosureLines.push("Editorially repaired before publication");
  }
  if (meta.used_fallback) {
    aiDisclosureLines.push("Produced via fallback generation path");
  }

  const badges: string[] = [];
  if (meta.publish_decision === "publish") badges.push("Cleared for publication");
  if (meta.is_breaking) badges.push("Breaking");

  const hasLayer = Boolean(
    editorialStatus ||
      sourceSummaryLines.length ||
      aiDisclosureLines.length ||
      badges.length ||
      meta.ai_confidence != null
  );

  if (!hasLayer) return null;

  return {
    trustLevel:
      meta.publish_decision === "publish" ? "Publication cleared" : null,
    editorialStatus,
    reviewStatus: null,
    verificationState: meta.publish_decision?.trim() || null,
    confidenceLabel: formatConfidenceLabel(meta.ai_confidence),
    sourceSummaryLines,
    aiDisclosureLines,
    badges,
    hasLayer,
  };
}

function buildGenerationVm(meta: EditorialMetadata): InspectorGenerationVm | null {
  const hasGeneration = Boolean(
    meta.model ||
      meta.generated_at ||
      meta.publish_decision ||
      meta.quality_breakdown ||
      meta.rejection_reasons?.length ||
      meta.source_count != null
  );

  if (!hasGeneration) return null;

  const metaExtras = meta as EditorialMetadata & {
    desk_template?: string;
    cost_tier?: string;
    cost_plan?: { tier?: string };
  };
  const costPlan = metaExtras.cost_plan;

  return {
    model: meta.model?.trim() || null,
    generatedAt: meta.generated_at ?? null,
    publishDecision: meta.publish_decision?.trim() || null,
    deskTemplate: metaExtras.desk_template?.trim() || null,
    costTier: costPlan?.tier?.trim() || metaExtras.cost_tier?.trim() || null,
    sourceCount:
      typeof meta.source_count === "number" ? meta.source_count : null,
    repaired: Boolean(meta.repaired),
    usedFallback: Boolean(meta.used_fallback),
    qualityBreakdown: meta.quality_breakdown ?? null,
    rejectionReasons: meta.rejection_reasons ?? [],
  };
}

export function buildEditorialIntelligenceInspector(
  article: EditorArticleRecord
): EditorialIntelligenceInspectorVm {
  const generatedRow = editorArticleToGeneratedRow(article);
  const meta = asEditorialMetadata(article.editorial_metadata);
  const newsArticle = editorArticleToNewsArticle(article, generatedRow);
  const section = inferSection(generatedRow);
  const eventViewModel = article.eventViewModel ?? null;

  const knowledge = buildStoryKnowledge({
    article: newsArticle,
    editorialMeta: meta,
    generatedRow,
    eventViewModel,
    tags: article.tags ?? [],
    attribution: {
      author: "Editorial Desk",
      desk: NEWS_DESKS["cg-ai-desk"],
      sourceLine: NEWS_DESKS["cg-ai-desk"].name,
      sourceCount:
        typeof meta.source_count === "number"
          ? meta.source_count
          : Array.isArray(meta.source_attribution)
            ? meta.source_attribution.length
            : 1,
      publishedLabel: section,
      categoryLabel: section,
      regionLabel: newsArticle.region === "chhattisgarh" ? "Chhattisgarh" : "India",
    },
  });

  const editorial = buildInspectorEditorialSlice(article, meta);
  const trust = buildInspectorTrustSlice(meta, article.editorial_status);
  const generation = buildGenerationVm(meta);
  const decision = buildDecisionIntelligence({
    article,
    meta,
    generatedRow,
    eventViewModel,
  });
  const workflow = buildWorkflowIntelligence({
    article,
    meta,
    generatedRow,
    eventViewModel,
  });
  const version = buildVersionIntelligence({
    article,
    meta,
    generatedRow,
    eventViewModel,
  });
  const navigation = buildIntelligenceNavigation({
    article,
    meta,
    knowledge: knowledge.hasLayer ? knowledge : null,
    eventViewModel,
  });

  const hasContent = Boolean(
    editorial ||
      trust?.hasLayer ||
      knowledge.hasLayer ||
      generation ||
      eventViewModel ||
      decision.hasLayer ||
      workflow.hasLayer ||
      version.hasLayer
  );

  return {
    hasContent,
    editorial,
    trust,
    knowledge: knowledge.hasLayer ? knowledge : null,
    generation,
    event: eventViewModel,
    decision: decision.hasLayer ? decision : null,
    workflow: workflow.hasLayer ? workflow : null,
    version: version.hasLayer ? version : null,
    navigation: navigation.hasLayer ? navigation : null,
  };
}
