/**
 * @deprecated Post-build locale filtering removed — server builds language-specific feeds.
 * Kept for articleLocaleReady() and legacy imports.
 */

import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import {
  resolveLocalizedFieldsStrict,
  type LocalizedArticleFields,
} from "@/lib/i18n/resolve-article";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export function isMatchingLanguage(
  sourceLanguage: string | null | undefined,
  selectedLanguage: NewsroomLanguage
): boolean {
  return normalizeArticleLanguage(sourceLanguage) === selectedLanguage;
}

export function articleLocaleReady(
  row: GeneratedArticleRow,
  selectedLanguage: NewsroomLanguage
): boolean {
  return resolveLocalizedFieldsStrict(row, selectedLanguage) !== null;
}

/** @deprecated Feeds are language-filtered before assembly — passthrough only. */
export function localizeGeneratedFeed(
  feed: GeneratedHomepageFeed,
  _selectedLanguage: NewsroomLanguage
): GeneratedHomepageFeed {
  return feed;
}

export type { LocalizedArticleFields };
