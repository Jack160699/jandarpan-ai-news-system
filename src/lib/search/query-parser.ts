/**
 * Multilingual query parsing — districts, categories, time scope (HI + EN)
 */

import { normalizeTitle } from "@/lib/news/normalize";
import type { HomeSectionId } from "@/lib/homepage/types";
import type {
  ParsedSearchQuery,
  SearchDistrict,
  SearchTimeScope,
} from "@/lib/search/types";

const DISTRICT_ALIASES: Record<SearchDistrict, string[]> = {
  raipur: ["raipur", "रायपुर", "naya raipur", "नया रायपुर"],
  bilaspur: ["bilaspur", "बिलासपुर"],
  bastar: ["bastar", "बस्तर", "jagdalpur"],
  durg: ["durg", "दुर्ग", "bhilai", "भिलाई"],
  bhilai: ["bhilai", "भिलाई", "durg-bhilai"],
  korba: ["korba", "कोरबा"],
  jagdalpur: ["jagdalpur", "जगदलपुर"],
  ambikapur: ["ambikapur", "अंबिकापुर", "surguja"],
  raigarh: ["raigarh", "रायगढ़"],
  chhattisgarh: [
    "chhattisgarh",
    "chattisgarh",
    "cg",
    "छत्तीसगढ",
    "छत्तीसगढ़",
    "c.g.",
  ],
};

const CATEGORY_ALIASES: Record<HomeSectionId, string[]> = {
  chhattisgarh: ["local", "regional", "state"],
  raipur: ["city", "capital"],
  india: ["politics", "political", "government", "election", "cabinet", "संसद", "राजनीति"],
  world: ["world", "global", "international"],
  business: ["business", "economy", "market", "industry", "व्यापार"],
  sports: ["sports", "sport", "cricket", "खेल"],
  education: ["education", "school", "exam", "university", "शिक्षा"],
};

const TOPIC_TO_CATEGORY: Record<string, HomeSectionId> = {
  crime: "chhattisgarh",
  police: "chhattisgarh",
  farmer: "business",
  agriculture: "business",
  health: "education",
  weather: "chhattisgarh",
};

const TIME_TERMS: Record<SearchTimeScope, string[]> = {
  today: ["today", "आज", "aaj", "now", "latest", "breaking", "live", "ताजा"],
  week: ["week", "weekly", "recent", "past week", "सप्ताह"],
  all: [],
};

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "and",
  "is",
  "are",
  "with",
  "from",
  "by",
  "news",
  "about",
  "near",
  "में",
  "के",
  "की",
  "से",
  "को",
  "पर",
  "और",
  "एक",
  "कि",
  "है",
  "समाचार",
  "खबर",
]);

function detectLanguageHint(text: string): "hi" | "en" | "mixed" {
  const devanagari = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  const latin = (text.match(/[a-z]/gi) ?? []).length;
  if (devanagari > latin) return "hi";
  if (latin > devanagari * 2) return "en";
  return "mixed";
}

function findDistrict(text: string): SearchDistrict | null {
  const lower = text.toLowerCase();
  for (const [district, aliases] of Object.entries(DISTRICT_ALIASES)) {
    if (aliases.some((a) => lower.includes(a))) {
      return district as SearchDistrict;
    }
  }
  return null;
}

function findCategory(tokens: string[]): HomeSectionId | null {
  const joined = tokens.join(" ");
  for (const [cat, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((a) => joined.includes(a))) {
      return cat as HomeSectionId;
    }
  }
  for (const [topic, cat] of Object.entries(TOPIC_TO_CATEGORY)) {
    if (joined.includes(topic)) return cat;
  }
  return null;
}

function findTimeScope(text: string): SearchTimeScope {
  const lower = text.toLowerCase();
  if (TIME_TERMS.today.some((t) => lower.includes(t))) return "today";
  if (TIME_TERMS.week.some((t) => lower.includes(t))) return "week";
  return "all";
}

function tokenizeQuery(raw: string): string[] {
  const normalized = normalizeTitle(raw);
  return normalized
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function stripMatchedPhrases(
  tokens: string[],
  district: SearchDistrict | null,
  category: HomeSectionId | null,
  timeScope: SearchTimeScope
): string[] {
  const remove = new Set<string>();

  if (district) {
    for (const a of DISTRICT_ALIASES[district]) {
      a.split(/\s+/).forEach((w) => remove.add(w));
    }
  }
  if (category) {
    for (const a of CATEGORY_ALIASES[category]) {
      a.split(/\s+/).forEach((w) => remove.add(w));
    }
  }
  if (timeScope === "today") {
    TIME_TERMS.today.forEach((t) => t.split(/\s+/).forEach((w) => remove.add(w)));
  }

  return tokens.filter((t) => !remove.has(t));
}

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim();
  const tokens = tokenizeQuery(trimmed);
  const district = findDistrict(trimmed);
  const category = findCategory(tokens);
  const timeScope = findTimeScope(trimmed);
  const cleanTerms = stripMatchedPhrases(tokens, district, category, timeScope);

  return {
    raw: trimmed,
    cleanTerms,
    district,
    category,
    timeScope,
    languageHint: detectLanguageHint(trimmed),
  };
}
