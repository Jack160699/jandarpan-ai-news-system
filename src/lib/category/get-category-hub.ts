/**
 * Category hub data — homepage projection + shared pool cache (ISR-safe)
 */

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { generatedToNewsArticle } from "@/lib/homepage/generated-adapter";
import { toHomeArticle } from "@/lib/homepage/generated-feed";
import type { HomeArticle } from "@/lib/homepage/types";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { ISR_TAGS } from "@/lib/infrastructure/cache/isr";
import { filterPoolByLanguage } from "@/lib/i18n/article-language";
import { resolveLocalizedFieldsStrict } from "@/lib/i18n/resolve-article";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { getStaticFallbackArticlePool } from "@/lib/news/fallback/wire-articles";
import {
  buildTrendingKeywords,
  getCategorySeo,
  matchesCategoryArticle,
} from "@/lib/seo";
import type { CategorySeoConfig } from "@/lib/seo/categories";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

/** Max stories rendered on a category hub. */
export const CATEGORY_DISPLAY_LIMIT = 24;

/**
 * Pool headroom for in-memory category matching (4× display cap).
 * Category filters run client-side on the latest published pool.
 */
export const CATEGORY_POOL_LIMIT = 96;

export type CategoryHubData = {
  homeArticles: HomeArticle[];
  localizedHeadlines: { slug: string; headline: string }[];
  trending: ReturnType<typeof buildTrendingKeywords>;
};

const CATEGORY_POOL_CACHE_TAGS = [
  ISR_TAGS.homepage,
  ISR_TAGS.homepageFeed,
  ISR_TAGS.categories,
] as const;

const getCachedCategoryArticlePool = unstable_cache(
  () =>
    fetchGeneratedArticlePool(CATEGORY_POOL_LIMIT, { select: "homepage" }),
  ["category-article-pool-v1"],
  {
    revalidate: INFRA_CONFIG.homepageCacheSeconds,
    tags: [...CATEGORY_POOL_CACHE_TAGS],
  }
);

function filterArticlesForCategory(
  rows: GeneratedArticleRow[],
  config: CategorySeoConfig
): GeneratedArticleRow[] {
  return rows.filter((row) => {
    const article = generatedToNewsArticle(row);
    return matchesCategoryArticle(config, {
      category: article.category,
      tags: row.tags,
      headline: row.headline,
      summary: row.summary ?? undefined,
    });
  });
}

async function buildCategoryHubUncached(
  slug: string,
  displayLanguage: NewsroomLanguage
): Promise<CategoryHubData | null> {
  const config = getCategorySeo(slug);
  if (!config) return null;

  const pool = await getCachedCategoryArticlePool();
  const fallbackPool = getStaticFallbackArticlePool();
  const langPool = filterPoolByLanguage(
    pool.length ? pool : fallbackPool,
    displayLanguage
  );
  const primaryMatches = filterArticlesForCategory(langPool, config);
  const matched = (
    primaryMatches.length
      ? primaryMatches
      : filterArticlesForCategory(
          filterPoolByLanguage(fallbackPool, displayLanguage),
          config
        )
  ).slice(0, CATEGORY_DISPLAY_LIMIT);

  const homeArticles = matched
    .map((row) => toHomeArticle(row, undefined, displayLanguage))
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const localizedForTrending = matched
    .map((row) => {
      const fields = resolveLocalizedFieldsStrict(row, displayLanguage);
      if (!fields) return null;
      return { ...row, headline: fields.headline };
    })
    .filter((row): row is GeneratedArticleRow => row !== null);

  const localizedHeadlines = localizedForTrending.map((row) => ({
    slug: row.slug,
    headline: row.headline,
  }));

  const trending = buildTrendingKeywords({
    generatedRows: localizedForTrending,
    limit: 10,
  });

  return { homeArticles, localizedHeadlines, trending };
}

function getCachedCategoryHubBuild(
  slug: string,
  displayLanguage: NewsroomLanguage
) {
  return unstable_cache(
    () => buildCategoryHubUncached(slug, displayLanguage),
    ["category-hub-v1", slug, displayLanguage],
    {
      revalidate: INFRA_CONFIG.homepageCacheSeconds,
      tags: [
        ...CATEGORY_POOL_CACHE_TAGS,
        `category:${slug}`,
        `lang:${displayLanguage}`,
      ],
    }
  );
}

async function getCategoryHubData(
  slug: string
): Promise<CategoryHubData | null> {
  const displayLanguage = await getServerReaderLanguage();
  return getCachedCategoryHubBuild(slug, displayLanguage)();
}

/** Per-request dedupe when metadata and page share the same slug. */
export const getCachedCategoryHubData = cache(getCategoryHubData);
