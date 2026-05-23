/**
 * Section inference — client-safe (no sharp / image pipeline)
 */

import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { HomeSectionId } from "@/lib/homepage/types";

export const REGIONAL_SECTIONS: Array<{
  id: HomeSectionId;
  label: string;
  labelHi: string;
  matchers: RegExp[];
}> = [
  {
    id: "chhattisgarh",
    label: "Chhattisgarh",
    labelHi: "छत्तीसगढ़",
    matchers: [/chhattisgarh/i, /छत्तीसगढ/i, /bastar/i, /बस्तर/i, /bilaspur/i, /durg/i, /korba/i, /jagdalpur/i],
  },
  {
    id: "raipur",
    label: "Raipur",
    labelHi: "रायपुर",
    matchers: [/raipur/i, /रायपुर/i, /naya raipur/i, /नया रायपुर/i],
  },
  {
    id: "india",
    label: "India",
    labelHi: "भारत",
    matchers: [/\bindia\b/i, /भारत/i, /national/i, /देश/i, /centre/i, /central government/i],
  },
  {
    id: "world",
    label: "World",
    labelHi: "विश्व",
    matchers: [/world/i, /global/i, /international/i, /विश्व/i, /अंतर्राष्ट्र/i],
  },
  {
    id: "business",
    label: "Business",
    labelHi: "व्यापार",
    matchers: [/business/i, /economy/i, /market/i, /व्यापार/i, /अर्थव्यवस्था/i, /industry/i, /steel/i, /coal/i],
  },
  {
    id: "sports",
    label: "Sports",
    labelHi: "खेल",
    matchers: [/sport/i, /cricket/i, /खेल/i, /क्रिकेट/i, /match/i],
  },
  {
    id: "education",
    label: "Education",
    labelHi: "शिक्षा",
    matchers: [/education/i, /school/i, /university/i, /शिक्षा/i, /स्कूल/i, /exam/i, /student/i],
  },
];

export function inferSection(row: GeneratedArticleRow): HomeSectionId {
  const tag = row.tags[0]?.toLowerCase() ?? "";
  const text = `${row.headline} ${row.summary ?? ""} ${tag}`.toLowerCase();

  for (const section of REGIONAL_SECTIONS) {
    if (section.matchers.some((re) => re.test(text))) return section.id;
  }

  const tagMap: Record<string, HomeSectionId> = {
    local: "chhattisgarh",
    politics: "india",
    world: "world",
    business: "business",
    sports: "sports",
    health: "education",
    technology: "business",
    entertainment: "world",
  };

  return tagMap[tag] ?? "chhattisgarh";
}
