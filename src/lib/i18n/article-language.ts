/**
 * Language availability — filter article pools before feed assembly.
 * Reader feeds must never mix languages; filter upstream, not post-build.
 */

import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { resolveLocalizedFieldsStrict } from "@/lib/i18n/resolve-article";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

/** True when headline + summary exist for the reader language (source or stored translation). */
export function isArticleAvailableInLanguage(
  row: GeneratedArticleRow,
  displayLanguage: NewsroomLanguage
): boolean {
  return resolveLocalizedFieldsStrict(row, displayLanguage) !== null;
}

/** Keep only rows renderable in the selected reader language. */
export function filterPoolByLanguage(
  rows: GeneratedArticleRow[],
  displayLanguage: NewsroomLanguage
): GeneratedArticleRow[] {
  return rows.filter((row) => isArticleAvailableInLanguage(row, displayLanguage));
}

/** Primary reader locales for Jandarpan (hi source → en translation). */
export const PRIMARY_READER_LANGUAGES: NewsroomLanguage[] = ["hi", "en"];

/** Target languages to auto-generate when missing (homepage + publish). */
export function translationTargetsForSource(
  sourceLanguage: NewsroomLanguage
): NewsroomLanguage[] {
  const source = normalizeArticleLanguage(sourceLanguage);
  if (source === "hi") return ["en"];
  if (source === "en") return ["hi"];
  return [];
}
