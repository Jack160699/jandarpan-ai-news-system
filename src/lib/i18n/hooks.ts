"use client";

import {
  formatNewsDate,
  formatNewsTime,
  formatRelativeTime,
} from "@/lib/i18n/format";
import { getSectionLabel } from "@/lib/i18n/section-labels";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeSectionId } from "@/lib/homepage/types";

/** Locale-aware time helpers bound to reader language */
export function useLocaleFormat() {
  const { language, t } = useLanguage();
  return {
    language,
    time: (iso: string) => formatNewsTime(iso, language),
    date: (iso: string) => formatNewsDate(iso, language, "short"),
    relative: (iso: string | null) => formatRelativeTime(iso, language),
    section: (id: HomeSectionId | string) => getSectionLabel(id, t, language),
  };
}

export function useLocalizedSectionLabel(
  section: HomeSectionId | string
): string {
  const { t, language } = useLanguage();
  return getSectionLabel(section, t, language);
}
