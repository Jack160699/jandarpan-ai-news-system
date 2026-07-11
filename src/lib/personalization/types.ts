import type { HomeArticle } from "@/lib/homepage/types";

/** Reorderable homepage modules — no duplicate sections */
export type HomepageModuleId =
  | "highlights-desk"
  | "recommended"
  | "shorts"
  | "trending"
  | "hyperlocal";

export type HomepageLayoutPrefs = {
  version: 1;
  order: HomepageModuleId[];
  hidden: HomepageModuleId[];
  pinned: HomepageModuleId[];
  onboardingDone: boolean;
  /** District slugs the reader follows (hyperlocal boost) */
  followedDistricts: string[];
};

export type PersonalizationSignals = {
  interestIds: string[];
  homeDistrict: string | null;
  followedDistricts: string[];
  bookmarkSlugs: string[];
  recentReadSlugs: string[];
};

export type RecommendedArticle = HomeArticle & {
  reason: string;
};
