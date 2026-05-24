import type { NewsroomLanguage } from "@/lib/i18n/languages";

/** Single-language label — English vs localized (Devanagari / regional UI copy) */
export function pickBilingualLabel(
  language: NewsroomLanguage,
  en: string,
  localized: string
): string {
  return language === "en" ? en : localized;
}

export function pickDeskLabel(
  language: NewsroomLanguage,
  desk: { name: string; nameHi: string }
): string {
  return pickBilingualLabel(language, desk.name, desk.nameHi);
}
