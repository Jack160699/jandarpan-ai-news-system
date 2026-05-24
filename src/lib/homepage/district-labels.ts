import type { HomeArticle } from "@/lib/homepage/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";

export type DistrictLabel = {
  label: string;
  labelHi: string;
};

const DISTRICTS: DistrictLabel[] = [
  { label: "Raipur", labelHi: "रायपुर" },
  { label: "Durg", labelHi: "दुर्ग" },
  { label: "Bilaspur", labelHi: "बिलासपुर" },
  { label: "Bastar", labelHi: "बस्तर" },
];

const SECTION_DISTRICT: Partial<Record<string, DistrictLabel>> = {
  raipur: DISTRICTS[0],
  chhattisgarh: DISTRICTS[0],
};

function matchTag(tags: string[], needle: string): boolean {
  const n = needle.toLowerCase();
  return tags.some((t) => t.toLowerCase().includes(n));
}

/** Resolve district badge for slider cards */
function pickDistrict(
  language: NewsroomLanguage,
  d: DistrictLabel
): string {
  return pickBilingualLabel(language, d.label, d.labelHi);
}

export function districtLabelFor(
  article: HomeArticle,
  index: number,
  language: NewsroomLanguage
): string {
  if (index === 0) return pickDistrict(language, DISTRICTS[0]);
  if (index === 1) return pickDistrict(language, DISTRICTS[1]);
  const fromSection = SECTION_DISTRICT[article.section];
  if (fromSection) return pickDistrict(language, fromSection);
  if (matchTag(article.tags, "durg")) return pickDistrict(language, DISTRICTS[1]);
  if (matchTag(article.tags, "bilaspur")) return pickDistrict(language, DISTRICTS[2]);
  if (matchTag(article.tags, "bastar")) return pickDistrict(language, DISTRICTS[3]);
  const fallback = DISTRICTS[index % DISTRICTS.length];
  return pickDistrict(language, fallback);
}
