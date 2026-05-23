/**
 * Resolve district / location label for live wire items
 */

import { REGIONAL_SECTIONS } from "@/lib/homepage/infer-section";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import type { HomeArticle } from "@/lib/homepage/types";

function matchDistrictInText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const d of CG_DISTRICTS) {
    if (d.aliases.some((a) => lower.includes(a.toLowerCase()))) {
      return d.nameHi;
    }
  }
  return null;
}

/** Compact location line for wire cards */
export function resolveWireLocation(article: HomeArticle): string {
  const tagBlob = article.tags.join(" ");
  const fromTags = matchDistrictInText(tagBlob);
  if (fromTags) return fromTags;

  const fromHeadline = matchDistrictInText(article.headline);
  if (fromHeadline) return fromHeadline;

  const section = REGIONAL_SECTIONS.find((s) => s.id === article.section);
  if (section && (article.section === "chhattisgarh" || article.section === "raipur")) {
    return section.labelHi;
  }

  return article.categoryLabel;
}
