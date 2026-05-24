/**
 * Resolve district / location label for live wire items
 */

import { REGIONAL_SECTIONS } from "@/lib/homepage/infer-section";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import type { HomeArticle } from "@/lib/homepage/types";

function matchDistrictInText(
  text: string,
  language: NewsroomLanguage
): string | null {
  const lower = text.toLowerCase();
  for (const d of CG_DISTRICTS) {
    if (d.aliases.some((a) => lower.includes(a.toLowerCase()))) {
      return pickBilingualLabel(language, d.name, d.nameHi);
    }
  }
  return null;
}

/** Compact location line for wire cards */
export function resolveWireLocation(
  article: HomeArticle,
  language: NewsroomLanguage = "hi"
): string {
  const tagBlob = article.tags.join(" ");
  const fromTags = matchDistrictInText(tagBlob, language);
  if (fromTags) return fromTags;

  const fromHeadline = matchDistrictInText(article.headline, language);
  if (fromHeadline) return fromHeadline;

  const section = REGIONAL_SECTIONS.find((s) => s.id === article.section);
  if (section && (article.section === "chhattisgarh" || article.section === "raipur")) {
    return pickBilingualLabel(language, section.label, section.labelHi);
  }

  return article.categoryLabel;
}
