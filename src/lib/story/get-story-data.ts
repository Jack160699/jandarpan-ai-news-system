/**
 * Story page data — per-request slug dedupe + cached related pool (ISR-safe)
 */

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { generatedToNewsArticle } from "@/lib/homepage/generated-adapter";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { ISR_TAGS } from "@/lib/infrastructure/cache/isr";
import { filterPoolByLanguage } from "@/lib/i18n/article-language";
import {
  applyLocalizedFieldsToNewsArticle,
  resolveLocalizedFieldsStrict,
} from "@/lib/i18n/resolve-article";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickEntityAwareRelatedStories } from "@/lib/story/story-entity-discovery";
import { getStaticFallbackArticlePool } from "@/lib/news/fallback/wire-articles";
import {
  fetchGeneratedArticlePool,
  getGeneratedArticleBySlug,
} from "@/lib/newsroom/generated/read";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";

/** Pool size for in-memory related-story ranking. */
export const STORY_RELATED_POOL_LIMIT = 80;

/** Related stories shown on immersive story pages. */
export const STORY_RELATED_DISPLAY_LIMIT = 8;

export type StoryRelatedArticlesResult = {
  articles: NewsArticleRow[];
  discoverySubtitle: string | null;
};

const STORY_CACHE_TAGS = [
  ISR_TAGS.homepage,
  ISR_TAGS.homepageFeed,
  ISR_TAGS.stories,
] as const;

function getCachedStoryArticleBySlugBuild(slug: string) {
  return unstable_cache(
    () => getGeneratedArticleBySlug(slug),
    ["story-article-v2", slug],
    {
      revalidate: INFRA_CONFIG.homepageCacheSeconds,
      tags: [...STORY_CACHE_TAGS, `story:${slug}`],
    }
  );
}

/**
 * Per-request dedupe — generateMetadata and the page share one slug lookup.
 * Cross-request ISR via unstable_cache.
 */
export const getStoryArticleBySlug = cache(async (slug: string) => {
  return getCachedStoryArticleBySlugBuild(slug)();
});

const getCachedStoryRelatedPool = unstable_cache(
  () =>
    fetchGeneratedArticlePool(STORY_RELATED_POOL_LIMIT, { select: "homepage" }),
  ["story-related-pool-v1"],
  {
    revalidate: INFRA_CONFIG.homepageCacheSeconds,
    tags: [...STORY_CACHE_TAGS],
  }
);

function mapPoolRowsToArticles(
  poolRows: GeneratedArticleRow[],
  readerLang: NewsroomLanguage
): NewsArticleRow[] {
  return poolRows
    .map((row) => {
      const fields = resolveLocalizedFieldsStrict(row, readerLang);
      if (!fields?.headline?.trim()) return null;
      return applyLocalizedFieldsToNewsArticle(
        generatedToNewsArticle(row),
        fields
      );
    })
    .filter((article): article is NewsArticleRow => article !== null);
}

async function buildStoryRelatedArticlesUncached(
  sourceSlug: string,
  readerLang: NewsroomLanguage
): Promise<StoryRelatedArticlesResult> {
  const [sourceRow, pool] = await Promise.all([
    getCachedStoryArticleBySlugBuild(sourceSlug)(),
    getCachedStoryRelatedPool(),
  ]);

  if (!sourceRow) return { articles: [], discoverySubtitle: null };

  const sourceFields = resolveLocalizedFieldsStrict(sourceRow, readerLang);
  if (!sourceFields?.headline?.trim()) {
    return { articles: [], discoverySubtitle: null };
  }

  const sourceArticle = applyLocalizedFieldsToNewsArticle(
    generatedToNewsArticle(sourceRow),
    sourceFields
  );

  const langPool = filterPoolByLanguage(pool, readerLang);
  const poolArticles = mapPoolRowsToArticles(langPool, readerLang);

  const { articles, discoverySubtitle } = pickEntityAwareRelatedStories(
    sourceArticle,
    sourceRow,
    langPool,
    poolArticles,
    STORY_RELATED_DISPLAY_LIMIT
  );

  return { articles, discoverySubtitle };
}

function getCachedStoryRelatedArticlesBuild(
  sourceSlug: string,
  readerLang: NewsroomLanguage
) {
  return unstable_cache(
    () => buildStoryRelatedArticlesUncached(sourceSlug, readerLang),
    ["story-related-v1", sourceSlug, readerLang],
    {
      revalidate: INFRA_CONFIG.homepageCacheSeconds,
      tags: [
        ...STORY_CACHE_TAGS,
        `story:${sourceSlug}`,
        `lang:${readerLang}`,
      ],
    }
  );
}

/** Cached related stories for a slug + reader language. */
export async function getStoryRelatedArticles(
  sourceSlug: string,
  readerLang: NewsroomLanguage
): Promise<StoryRelatedArticlesResult> {
  return getCachedStoryRelatedArticlesBuild(sourceSlug, readerLang)();
}

/** Static params — slug list only; homepage projection omits article_body. */
export async function getStoryStaticSlugs(limit = 200): Promise<string[]> {
  const pool = await fetchGeneratedArticlePool(limit, { select: "homepage" });
  if (pool.length > 0) {
    return pool.map((row) => row.slug).filter(Boolean);
  }
  return getStaticFallbackArticlePool()
    .map((row) => row.slug)
    .filter(Boolean);
}
