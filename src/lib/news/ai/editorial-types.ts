/**
 * Shared editorial generation types
 */

import type { EditorialQualityReport } from "@/lib/news/ai/editorial-guards";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { AiProviderId } from "@/lib/ai/providers/types";

export type SupportedEditorialLanguage = "hi" | "en";

export type EditorialDraft = {
  headline: string;
  summary: string;
  article_body: string;
  seo_title: string;
  seo_description: string;
  tags: string[];
  reading_time: string;
  language: SupportedEditorialLanguage;
};

/**
 * Independent-reviewer verdict shape — parsed JSON from the model. Kept
 * loose (Record<string, unknown>) at the call boundary so the fact-pack
 * workstream (src/lib/news/ai/fact-pack.ts) can consume it without a hard
 * type dependency on this module's exact schema.
 */
export type IndependentReviewVerdict = {
  passed: boolean;
  issues: string[];
  sensitivity_flags: string[];
  confidence: number;
};

export type IndependentReviewResult = {
  passed: boolean;
  verdict: Record<string, unknown>;
  provider: AiProviderId | null;
  error?: string;
};

/** Persisted into editorial_metadata.independent_review (see generate-article.ts). */
export type IndependentReviewMetadata = {
  passed: boolean;
  issues: string[];
  sensitivity_flags: string[];
  confidence: number | null;
  provider: AiProviderId | null;
  error?: string;
};

export type EditorialGenerationResult = {
  ok: boolean;
  article: GeneratedArticleRow | null;
  draft: EditorialDraft | null;
  quality: EditorialQualityReport | null;
  skipped: boolean;
  repaired?: boolean;
  usedFallback?: boolean;
  reason?: string;
  independentReview?: IndependentReviewResult;
};

export type BatchEditorialResult = {
  generated: number;
  rejected: number;
  published: number;
  repaired: number;
  skipped: number;
  avgConfidence: number;
  /** Material updates applied to already-published stories (not new publishes) */
  updates?: number;
  topStory: {
    storyId: string | null;
    title: string;
    confidence: number;
  } | null;
  errors: string[];
  /** Per-reason skip tallies for generation-yield observability */
  skipReasonCounts?: Record<string, number>;
  candidatePool?: {
    windowed: number;
    resolvable: number;
    filteredNoSignals: number;
    selected: number;
  };
  qualityMetrics?: {
    passRate: number;
    titleFailure: number;
    bodyFailure: number;
    missingSource: number;
    duplicateRejection: number;
    languageFailure: number;
    retries: number;
    quarantined: number;
    manualReview: number;
  };
  results: Array<{
    eventId: string;
    ok: boolean;
    published?: boolean;
    repaired?: boolean;
    updated?: boolean;
    reason?: string;
    confidence?: number;
    readability?: number;
    seoQuality?: number;
    localRelevance?: number;
    originality?: number;
    publishDecision?: string;
    rejectionReasons?: string[];
  }>;
};
