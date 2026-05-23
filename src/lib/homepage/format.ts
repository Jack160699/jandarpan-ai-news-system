/**
 * Homepage display helpers
 */

import { formatNewsDate, formatNewsTime } from "@/lib/i18n/format";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { REGIONAL_SECTIONS } from "@/lib/homepage/infer-section";
import type { HomeSectionId } from "@/lib/homepage/types";

export function formatHomeTime(
  iso: string,
  lang: NewsroomLanguage = "hi"
): string {
  return formatNewsTime(iso, lang);
}

export function formatHomeDate(
  iso: string,
  lang: NewsroomLanguage = "hi"
): string {
  return formatNewsDate(iso, lang, "short");
}

export function confidenceLabel(score: number): string {
  if (score >= 0.75) return "High";
  if (score >= 0.5) return "Verified";
  return "Desk";
}

export function getCategoryLabel(section: HomeSectionId): string {
  const def = REGIONAL_SECTIONS.find((s) => s.id === section);
  return def?.label ?? section;
}

export function getCategoryLabelHi(section: HomeSectionId): string {
  const def = REGIONAL_SECTIONS.find((s) => s.id === section);
  return def?.labelHi ?? section;
}
