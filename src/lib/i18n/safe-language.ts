import { isNewsroomLanguage, type NewsroomLanguage } from "@/lib/i18n/languages";
import type { AppLanguage } from "@/lib/i18n/types";

const FALLBACK: AppLanguage = "hi";

/** Safe language for client render — never undefined or invalid */
export function normalizeAppLanguage(
  language: string | null | undefined
): AppLanguage {
  if (language && isNewsroomLanguage(language)) return language;
  return FALLBACK;
}

export function safeLanguage(language: NewsroomLanguage | string | undefined): NewsroomLanguage {
  return normalizeAppLanguage(language);
}
