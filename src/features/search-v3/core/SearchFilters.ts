import type { HomeSectionId } from "@/lib/homepage/types";
import {
  SEARCH_V3_CATEGORIES,
  SEARCH_V3_DISTRICTS,
  SEARCH_V3_TOPICS,
} from "../constants";

export {
  SEARCH_V3_CATEGORIES,
  SEARCH_V3_DISTRICTS,
  SEARCH_V3_TOPICS,
};

/** Quick district chips shown in filter row (V3 + legacy overlay). */
export const SEARCH_QUICK_DISTRICTS = [
  { id: "raipur", label: "Raipur", labelHi: "रायपुर" },
  { id: "bilaspur", label: "Bilaspur", labelHi: "बिलासपुर" },
  { id: "bastar", label: "Bastar", labelHi: "बस्तर" },
  { id: "chhattisgarh", label: "CG", labelHi: "छ.ग." },
] as const;

/** Primary filter categories (first four V3 categories). */
export const SEARCH_FILTER_CATEGORIES = SEARCH_V3_CATEGORIES.slice(0, 4);

/** Legacy SearchPanel district chips — preserves production UI labels. */
export const LEGACY_FILTER_DISTRICTS = [
  { id: "raipur", label: "Raipur" },
  { id: "bilaspur", label: "Bilaspur" },
  { id: "bastar", label: "Bastar" },
  { id: "chhattisgarh", label: "CG" },
] as const;

/** Legacy SearchPanel category chips — preserves production UI labels. */
export const LEGACY_FILTER_CATEGORIES: { id: HomeSectionId; label: string }[] = [
  { id: "india", label: "Politics" },
  { id: "business", label: "Business" },
  { id: "sports", label: "Sports" },
  { id: "education", label: "Education" },
];
