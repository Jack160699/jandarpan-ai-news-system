/**
 * Language availability — filter article pools before feed assembly.
 * Reader feeds must never mix languages; filter upstream, not post-build.
 */

import {
  getLanguageConfig,
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { resolveLocalizedFieldsStrict } from "@/lib/i18n/resolve-article";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const DEVANAGARI = /[\u0900-\u097F]/;
const BENGALI = /[\u0980-\u09FF]/;
const TAMIL = /[\u0B80-\u0BFF]/;
const ARABIC = /[\u0600-\u06FF]/;

function textMatchesReaderScript(
  text: string,
  displayLanguage: NewsroomLanguage
): boolean {
  const sample = text.trim().slice(0, 320);
  if (!sample) return false;

  switch (getLanguageConfig(displayLanguage).script) {
    case "devanagari":
      return DEVANAGARI.test(sample);
    case "latin":
      return (
        !DEVANAGARI.test(sample) &&
        !BENGALI.test(sample) &&
        !TAMIL.test(sample) &&
        !ARABIC.test(sample)
      );
    case "bengali":
      return BENGALI.test(sample);
    case "tamil":
      return TAMIL.test(sample);
    case "arabic":
      return ARABIC.test(sample);
    default:
      return true;
  }
}

/** True when headline + summary exist for the reader language (source or stored translation). */
export function isArticleAvailableInLanguage(
  row: GeneratedArticleRow,
  displayLanguage: NewsroomLanguage
): boolean {
  const fields = resolveLocalizedFieldsStrict(row, displayLanguage);
  if (!fields?.headline?.trim()) return false;
  return textMatchesReaderScript(fields.headline, displayLanguage);
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
