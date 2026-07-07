/**
 * On-demand translation enqueue — queue-only for automatic paths.
 * Synchronous translation remains available via worker_jobs / manual API.
 */

import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { isArticleAvailableInLanguage } from "@/lib/i18n/article-language";
import { getArticleTranslations } from "@/lib/i18n/resolve-article";
import { enqueueArticleTranslation } from "@/lib/i18n/multilingual/translation-queue";
import type { ArticleTranslations } from "@/lib/i18n/multilingual/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Enqueue translation jobs for pool rows missing the reader language.
 * Does not block homepage render; job_processor drains the queue.
 */
export function scheduleMissingTranslations(
  rows: GeneratedArticleRow[],
  targetLanguage: NewsroomLanguage,
  options?: { max?: number }
): void {
  if (!hasOpenAiKey()) return;

  const max = options?.max ?? 10;
  const target = normalizeArticleLanguage(targetLanguage);
  const missing = rows
    .filter((row) => {
      const rowSource = normalizeArticleLanguage(row.language);
      return rowSource !== target && !isArticleAvailableInLanguage(row, target);
    })
    .slice(0, max);

  for (const row of missing) {
    void enqueueArticleTranslation(row, target, { priority: 5 }).catch(
      () => undefined
    );
  }
}

/**
 * @deprecated Automatic paths use enqueueArticleTranslation. Kept for manual/sync tooling.
 */
export async function ensureArticleTranslation(
  row: GeneratedArticleRow,
  targetLanguage: NewsroomLanguage
): Promise<import("@/lib/i18n/multilingual/types").ArticleLocaleBundle | null> {
  const target = normalizeArticleLanguage(targetLanguage);
  const source = normalizeArticleLanguage(row.language);

  if (target === source) {
    return null;
  }

  const existing = getArticleTranslations(
    row.editorial_metadata,
    row.translations as ArticleTranslations | null
  )[target];
  if (existing?.headline?.trim() && existing.summary?.trim()) {
    return existing;
  }

  if (!hasOpenAiKey()) return null;

  await enqueueArticleTranslation(row, target, { priority: 9 });
  return null;
}
