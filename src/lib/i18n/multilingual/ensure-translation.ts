/**
 * On-demand translation — generate once, persist, dedupe in-flight + recent attempts.
 */

import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { isArticleAvailableInLanguage } from "@/lib/i18n/article-language";
import { getArticleTranslations } from "@/lib/i18n/resolve-article";
import {
  persistArticleTranslations,
  translateArticleBundle,
} from "@/lib/i18n/multilingual/translate";
import type { ArticleLocaleBundle, ArticleTranslations } from "@/lib/i18n/multilingual/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const inFlight = new Map<string, Promise<boolean>>();
const recentAttempts = new Map<string, number>();

const ATTEMPT_COOLDOWN_MS = Number(
  process.env.TRANSLATION_RETRY_COOLDOWN_MS ?? 600_000
);

function jobKey(articleId: string, target: NewsroomLanguage): string {
  return `${articleId}:${target}`;
}

function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Translate a single article to `targetLanguage` if missing. Persists to
 * `editorial_metadata.translations`. Safe to call repeatedly — deduped.
 */
export async function ensureArticleTranslation(
  row: GeneratedArticleRow,
  targetLanguage: NewsroomLanguage
): Promise<ArticleLocaleBundle | null> {
  const target = normalizeArticleLanguage(targetLanguage);
  const source = normalizeArticleLanguage(row.language);

  if (target === source) {
    return null;
  }

  const existing = getArticleTranslations(row.editorial_metadata)[target];
  if (existing?.headline?.trim() && existing.summary?.trim()) {
    return existing;
  }

  if (!hasOpenAiKey()) return null;

  const key = jobKey(row.id, target);
  const last = recentAttempts.get(key);
  if (last && Date.now() - last < ATTEMPT_COOLDOWN_MS) {
    return null;
  }

  const pending = inFlight.get(key);
  if (pending) {
    const ok = await pending;
    return ok ? getArticleTranslations(row.editorial_metadata)[target] ?? null : null;
  }

  const job = (async (): Promise<boolean> => {
    recentAttempts.set(key, Date.now());

    const bundle = await translateArticleBundle({
      headline: row.headline,
      summary: row.summary ?? "",
      article_body: row.article_body ?? "",
      seo_title: row.seo_title ?? row.headline,
      seo_description: row.seo_description ?? row.summary ?? "",
      tags: row.tags ?? [],
      sourceLanguage: source,
      targetLanguage: target,
    });

    if (!bundle) return false;

    const translations =
      (row.editorial_metadata?.translations as ArticleTranslations) ?? {};

    await persistArticleTranslations(
      row.id,
      { ...translations, [target]: bundle },
      row.editorial_metadata
    );

    row.editorial_metadata = {
      ...row.editorial_metadata,
      translations: { ...translations, [target]: bundle },
    };

    return true;
  })();

  inFlight.set(key, job);
  try {
    const ok = await job;
    return ok ? getArticleTranslations(row.editorial_metadata)[target] ?? null : null;
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Fire-and-forget translation for pool rows missing the reader language.
 * Does not block homepage render; fills gaps between publishes.
 */
export function scheduleMissingTranslations(
  rows: GeneratedArticleRow[],
  targetLanguage: NewsroomLanguage,
  options?: { max?: number }
): void {
  if (!hasOpenAiKey()) return;

  const max = options?.max ?? 10;
  const source = normalizeArticleLanguage(targetLanguage);
  const missing = rows
    .filter((row) => {
      const rowSource = normalizeArticleLanguage(row.language);
      return rowSource !== source && !isArticleAvailableInLanguage(row, source);
    })
    .slice(0, max);

  for (const row of missing) {
    void ensureArticleTranslation(row, source).catch(() => undefined);
  }
}
