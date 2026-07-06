/**
 * Homepage news shorts rail — build from article pool
 */

import { normalizeArticleLanguage, type NewsroomLanguage } from "@/lib/i18n/languages";
import { resolveLocalizedFieldsStrict } from "@/lib/i18n/resolve-article";
import { ensureShortCard } from "@/lib/news/shorts/ensure-card";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

function rowForLanguage(
  row: GeneratedArticleRow,
  displayLanguage: NewsroomLanguage
): GeneratedArticleRow | null {
  const fields = resolveLocalizedFieldsStrict(row, displayLanguage);
  if (!fields) return null;
  return {
    ...row,
    headline: fields.headline,
    summary: fields.summary,
    language: fields.language,
  };
}

export function buildNewsShortsFromPool(
  rows: GeneratedArticleRow[],
  limit = 6,
  displayLanguage: NewsroomLanguage = "hi"
): NewsShortCard[] {
  const candidates = [...rows]
    .filter((r) => (r.summary?.length ?? 0) > 40)
    .sort(
      (a, b) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime()
    )
    .slice(0, limit * 4);

  const cards: NewsShortCard[] = [];

  for (const row of candidates) {
    const localized = rowForLanguage(row, displayLanguage);
    if (!localized) continue;
    const card = ensureShortCard(localized);
    if (card) cards.push(card);
    if (cards.length >= limit) break;
  }

  return cards;
}

/** Trending shorts — separate pool from homepage slots */
export function buildTrendingShortsFromPool(
  rows: GeneratedArticleRow[],
  limit = 8,
  displayLanguage: NewsroomLanguage = "hi",
  options?: {
    preferredArticleIds?: string[];
    reservedIds?: Set<string>;
    maxHomepageOverlap?: number;
  }
): NewsShortCard[] {
  const reserved = options?.reservedIds ?? new Set<string>();
  const maxOverlap = options?.maxHomepageOverlap ?? 1;
  const preferred = new Set(options?.preferredArticleIds ?? []);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const cards: NewsShortCard[] = [];
  let overlap = 0;

  const pushRow = (row: GeneratedArticleRow) => {
    const localized = rowForLanguage(row, displayLanguage);
    if (!localized) return;
    const card = ensureShortCard(localized);
    if (card) cards.push(card);
  };

  for (const id of preferred) {
    if (cards.length >= limit) break;
    const row = byId.get(id);
    if (!row) continue;
    if (reserved.has(id)) {
      if (overlap >= maxOverlap) continue;
      overlap++;
    }
    pushRow(row);
  }

  if (cards.length >= limit) return cards.slice(0, limit);

  const filler = buildNewsShortsFromPool(rows, limit * 3, displayLanguage);
  for (const card of filler) {
    if (cards.length >= limit) break;
    if (cards.some((c) => c.articleId === card.articleId)) continue;
    if (reserved.has(card.articleId)) {
      if (overlap >= maxOverlap) continue;
      overlap++;
    }
    cards.push(card);
  }

  return cards.slice(0, limit);
}
