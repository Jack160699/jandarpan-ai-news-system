import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
export type SuperMenuLink = {
  id: string;
  href: string;
  labelEn: string;
  labelHi: string;
};

export const MENU_SETTINGS_LINKS: SuperMenuLink[] = [
  { id: "privacy", href: "/privacy", labelEn: "Privacy", labelHi: "गोपनीयता" },
  { id: "terms", href: "/terms", labelEn: "Terms", labelHi: "नियम" },
  { id: "notifications", href: "/archive", labelEn: "Notifications", labelHi: "सूचनाएँ" },
  { id: "about", href: "/search?q=about+jan+darpan", labelEn: "About", labelHi: "हमारे बारे में" },
];

export function labelForLink(
  link: { labelEn: string; labelHi: string },
  language: NewsroomLanguage
): string {
  return pickBilingualLabel(language, link.labelEn, link.labelHi);
}

/** Internal — reader prefs validation (not shown in menu UI) */
export const FEED_INTERESTS: { id: string; labelEn: string; labelHi: string }[] = [
  { id: "cg-news", labelEn: "CG News", labelHi: "छत्तीसगढ़" },
  { id: "politics", labelEn: "Politics", labelHi: "राजनीति" },
  { id: "business", labelEn: "Business", labelHi: "व्यापार" },
  { id: "raipur", labelEn: "Raipur", labelHi: "रायपुर" },
];
