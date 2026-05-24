import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsCategory } from "@/lib/types/news-article";

const CATEGORY_EN: Record<NewsCategory, string> = {
  local: "Chhattisgarh",
  politics: "Politics",
  business: "Business",
  technology: "Technology",
  sports: "Sports",
  entertainment: "Entertainment",
  health: "Health",
  world: "World",
};

const CATEGORY_LOCALIZED: Record<NewsCategory, string> = {
  local: "छत्तीसगढ़",
  politics: "राजनीति",
  business: "व्यापार",
  technology: "टेक",
  sports: "खेल",
  entertainment: "मनोरंजन",
  health: "स्वास्थ्य",
  world: "विश्व",
};

/** Client-safe category chip — single language */
export function displayCategoryLabel(
  category: NewsCategory,
  language: NewsroomLanguage
): string {
  const en = CATEGORY_EN[category] ?? category;
  const loc = CATEGORY_LOCALIZED[category] ?? en;
  return pickBilingualLabel(language, en, loc);
}
