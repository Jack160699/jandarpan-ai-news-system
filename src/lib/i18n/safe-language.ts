import type { NewsroomLanguage } from "@/lib/i18n/languages";
import {
  isReaderLanguage,
  toReaderLanguage,
  type ReaderLanguage,
} from "@/lib/i18n/reader-languages";
import type { AppLanguage } from "@/lib/i18n/types";

const FALLBACK: ReaderLanguage = "hi";

/** Safe reader language — maps legacy stored values to hi/en/cg */
export function normalizeAppLanguage(
  language: string | null | undefined
): AppLanguage {
  if (language && isReaderLanguage(language)) return language;
  return FALLBACK;
}

export function safeLanguage(
  language: NewsroomLanguage | string | undefined
): NewsroomLanguage {
  return toReaderLanguage(language, FALLBACK);
}
