import type { ReactNode } from "react";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
export type SuperMenuLink = {
  id: string;
  href: string;
  labelEn: string;
  labelHi: string;
};

export type SuperMenuUtilityLink = SuperMenuLink & {
  tone?: "default" | "live";
  icon: ReactNode;
};

export const MENU_SETTINGS_LINKS: SuperMenuLink[] = [
  { id: "privacy", href: "/privacy", labelEn: "Privacy", labelHi: "गोपनीयता" },
  { id: "terms", href: "/terms", labelEn: "Terms", labelHi: "नियम" },
  { id: "notifications", href: "/archive", labelEn: "Notifications", labelHi: "सूचनाएँ" },
  { id: "about", href: "/search?q=about+jan+darpan", labelEn: "About", labelHi: "हमारे बारे में" },
];

export const MENU_UTILITIES: SuperMenuUtilityLink[] = [
  {
    id: "live-news",
    href: "/#live-latest",
    labelEn: "Live News",
    labelHi: "लाइव न्यूज़",
    tone: "live",
    icon: "LIVE",
  },
  {
    id: "weather",
    href: "/weather",
    labelEn: "Weather",
    labelHi: "मौसम",
    icon: "WX",
  },
  {
    id: "market",
    href: "/markets",
    labelEn: "Market",
    labelHi: "मार्केट",
    icon: "₹",
  },
  {
    id: "epaper",
    href: "/epaper",
    labelEn: "ePaper",
    labelHi: "ई-पेपर",
    icon: "EP",
  },
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
