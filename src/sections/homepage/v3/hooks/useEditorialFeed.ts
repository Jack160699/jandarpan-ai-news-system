"use client";

import { useMemo } from "react";
import type { HomeArticle } from "@/lib/homepage/types";
import type { RecommendedArticle } from "@/lib/personalization/types";
import { buildEditorialFeedItems } from "../lib/editorial-feed-rhythm";

type UseEditorialFeedArgs = {
  storyFeed: HomeArticle[];
  districtNews: HomeArticle[];
  liveUpdates: HomeArticle[];
  recommended: RecommendedArticle[];
  trendingFallback: HomeArticle[];
};

export function useEditorialFeed({
  storyFeed,
  districtNews,
  liveUpdates,
  recommended,
  trendingFallback,
}: UseEditorialFeedArgs) {
  return useMemo(() => {
    const personalized =
      recommended.length > 0 ? recommended : trendingFallback;

    return buildEditorialFeedItems(
      storyFeed,
      districtNews,
      personalized,
      liveUpdates
    );
  }, [storyFeed, districtNews, liveUpdates, recommended, trendingFallback]);
}
