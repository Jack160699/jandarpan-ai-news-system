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

/** Relative "Updated …" label for homepage trust rows. */
export function formatHomeUpdated(
  iso: string,
  lang: NewsroomLanguage = "hi"
): string {
  if (!iso?.trim()) return "";

  const prefix = lang === "hi" ? "अपडेट" : "Updated";
  const yesterday = lang === "hi" ? "कल" : "Yesterday";
  const diffMs = Date.now() - new Date(iso).getTime();

  if (!Number.isFinite(diffMs) || diffMs < 0) return "";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${prefix} ${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${prefix} ${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days === 1) return `${prefix} ${yesterday}`;

  return `${prefix} ${days}d ago`;
}

export function getCategoryLabel(section: HomeSectionId): string {
  const def = REGIONAL_SECTIONS.find((s) => s.id === section);
  return def?.label ?? section;
}

export function getCategoryLabelHi(section: HomeSectionId): string {
  const def = REGIONAL_SECTIONS.find((s) => s.id === section);
  return def?.labelHi ?? section;
}
