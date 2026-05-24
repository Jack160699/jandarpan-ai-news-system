import type { HomeArticle } from "@/lib/homepage/types";

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
export function districtLabelFor(
  article: HomeArticle,
  index: number,
  language: "en" | "hi" | string
): string {
  const fromSection = SECTION_DISTRICT[article.section];
  if (fromSection) {
    return language === "hi" ? fromSection.labelHi : fromSection.label;
  }
  if (matchTag(article.tags, "durg")) {
    return language === "hi" ? DISTRICTS[1].labelHi : DISTRICTS[1].label;
  }
  if (matchTag(article.tags, "bilaspur")) {
    return language === "hi" ? DISTRICTS[2].labelHi : DISTRICTS[2].label;
  }
  if (matchTag(article.tags, "bastar")) {
    return language === "hi" ? DISTRICTS[3].labelHi : DISTRICTS[3].label;
  }
  const fallback = DISTRICTS[index % DISTRICTS.length];
  return language === "hi" ? fallback.labelHi : fallback.label;
}
