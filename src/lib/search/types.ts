/**
 * Multilingual news search types
 */

import type { HomeSectionId } from "@/lib/homepage/types";

export type SearchDistrict =
  | "raipur"
  | "bilaspur"
  | "bastar"
  | "durg"
  | "bhilai"
  | "korba"
  | "jagdalpur"
  | "ambikapur"
  | "raigarh"
  | "chhattisgarh";

export type SearchTimeScope = "today" | "week" | "all";

export type ParsedSearchQuery = {
  raw: string;
  cleanTerms: string[];
  district: SearchDistrict | null;
  category: HomeSectionId | null;
  timeScope: SearchTimeScope;
  languageHint: "hi" | "en" | "mixed";
};

export type SearchFilters = {
  district?: SearchDistrict | null;
  category?: HomeSectionId | null;
  timeScope?: SearchTimeScope;
  limit?: number;
};

export type SearchHit = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  imageUrl: string | null;
  section: HomeSectionId;
  district: SearchDistrict | null;
  publishedAt: string;
  readingTime: string | null;
  score: number;
  /** Internal ranking signals — not rendered in UI by default */
  matchReasons: string[];
};

export type SearchResult = {
  query: string;
  parsed: ParsedSearchQuery;
  hits: SearchHit[];
  total: number;
  trending: string[];
  tookMs: number;
};
