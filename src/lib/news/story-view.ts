/**
 * Story page view model — desk branding, nav, attribution
 */

import { categoryLabel } from "@/lib/live-news-display";
import { REGIONAL_SECTIONS } from "@/lib/homepage/infer-section";
import type { HomeSectionId } from "@/lib/homepage/types";
import {
  displaySourceLine,
  mapProviderToDesk,
  type NewsDeskLabel,
} from "@/lib/newsroom/desk-branding";
import type { EditorialMetadata } from "@/lib/types/newsroom";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

export type StoryCategoryLink = {
  id: string;
  label: string;
  labelHi?: string;
  href: string;
  active: boolean;
};

const CATEGORY_TO_SECTION: Partial<Record<NewsCategory, HomeSectionId>> = {
  local: "chhattisgarh",
  politics: "india",
  world: "world",
  business: "business",
  sports: "sports",
  health: "education",
  technology: "india",
  entertainment: "india",
};

const SECTION_ANCHORS: Partial<Record<HomeSectionId, string>> = {
  chhattisgarh: "#nr-regional-title",
  raipur: "#nr-regional-title",
  india: "#nr-categories-title",
  world: "#nr-categories-title",
  business: "#nr-categories-title",
  sports: "#nr-categories-title",
  education: "#nr-categories-title",
};

export function buildStoryCategoryNav(
  category: NewsCategory,
  region?: string | null
): StoryCategoryLink[] {
  const activeSection =
    region === "chhattisgarh"
      ? "chhattisgarh"
      : CATEGORY_TO_SECTION[category] ?? "india";

  return REGIONAL_SECTIONS.map((def) => ({
    id: def.id,
    label: def.label,
    labelHi: def.labelHi,
    href: `/${SECTION_ANCHORS[def.id] ?? "#nr-editors-title"}`,
    active: def.id === activeSection,
  }));
}

export type StoryAttribution = {
  author: string;
  desk: NewsDeskLabel;
  sourceLine: string;
  sourceCount: number;
  publishedLabel: string;
  categoryLabel: string;
  regionLabel: string;
};

export function buildStoryAttribution(
  article: NewsArticleRow,
  meta?: EditorialMetadata | null
): StoryAttribution {
  const desk = mapProviderToDesk(article.provider);
  const category = article.category as NewsCategory;
  const attributionCount = Array.isArray(meta?.source_attribution)
    ? meta.source_attribution.length
    : 0;
  const sourceCount = (meta?.source_count ?? attributionCount) || 1;

  const regionLabel =
    article.region === "chhattisgarh"
      ? "Chhattisgarh"
      : article.region === "india"
        ? "India"
        : "Global";

  return {
    author: article.author?.trim() || "Editorial Desk",
    desk,
    sourceLine: displaySourceLine(desk, article.source),
    sourceCount: Math.max(1, sourceCount),
    publishedLabel: categoryLabel(category),
    categoryLabel: categoryLabel(category),
    regionLabel,
  };
}
