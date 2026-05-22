/**
 * Shared editorial generation types
 */

import type { EditorialQualityReport } from "@/lib/news/ai/editorial-guards";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

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

export type EditorialGenerationResult = {
  ok: boolean;
  article: GeneratedArticleRow | null;
  draft: EditorialDraft | null;
  quality: EditorialQualityReport | null;
  skipped: boolean;
  repaired?: boolean;
  usedFallback?: boolean;
  reason?: string;
};

export type BatchEditorialResult = {
  generated: number;
  rejected: number;
  published: number;
  repaired: number;
  skipped: number;
  avgConfidence: number;
  topStory: {
    storyId: string | null;
    title: string;
    confidence: number;
  } | null;
  errors: string[];
  results: Array<{
    eventId: string;
    ok: boolean;
    published?: boolean;
    repaired?: boolean;
    reason?: string;
    confidence?: number;
    rejectionReasons?: string[];
  }>;
};
