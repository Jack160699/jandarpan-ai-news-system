/**
 * Unified translation target languages — single source of truth for cost control.
 */

import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { READER_TRANSLATION_PAIRS } from "@/lib/i18n/multilingual/translation-queue";

/** Reader-priority targets derived from production translation pairs (hi↔en, hi→cg). */
export const READER_TRANSLATION_TARGETS: NewsroomLanguage[] = [
  ...new Set(
    READER_TRANSLATION_PAIRS.flatMap((pair) => [pair.source, pair.target])
  ),
];

function parseEnvTranslationTargets(): NewsroomLanguage[] | null {
  const raw = process.env.NEWSROOM_TRANSLATE_LANGS?.trim();
  if (!raw) return null;
  const langs = raw
    .split(",")
    .map((s) => normalizeArticleLanguage(s))
    .filter((lang, index, arr) => arr.indexOf(lang) === index);
  return langs.length ? langs : null;
}

/** Effective translation targets for batch/cron pipelines. Override via NEWSROOM_TRANSLATE_LANGS. */
export function getTranslationTargets(): NewsroomLanguage[] {
  return parseEnvTranslationTargets() ?? READER_TRANSLATION_TARGETS;
}
