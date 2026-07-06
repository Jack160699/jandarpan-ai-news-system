/**
 * Live story SEO — fast metadata + JSON-LD (delegates to lib/seo)
 */

import type { Metadata } from "next";
import { resolveArticleProvider } from "@/lib/news/article-provider";
import { isArticleLive } from "@/lib/news/home-ranking";
import { buildEditorialHeroDisplay } from "@/lib/news/images/editorial-hero-display";
import { resolveStorySlug } from "@/lib/news/related-stories";
import {
  buildStoryBreadcrumbs,
  buildPageMetadata,
  liveNewsArticleJsonLd,
  newsKeywordsForArticle,
} from "@/lib/seo";
import { buildTrendingKeywords } from "@/lib/seo/trending-keywords";
import { resolveNewsArticleModifiedAt } from "@/lib/seo/article-dates";
import { SITE_URL } from "@/lib/seo/constants";
import {
  displaySourceLine,
  mapProviderToDesk,
} from "@/lib/newsroom/desk-branding";
import { BRAND } from "@/lib/brand";
import type { EditorialImageMeta } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";

export function resolveStoryOgImage(
  article: NewsArticleRow,
  imageMeta?: EditorialImageMeta | null
): string {
  const display = buildEditorialHeroDisplay({
    heroUrl: article.image_url,
    category: article.category,
    region: article.region,
    source: article.source,
    imageMeta: imageMeta ?? undefined,
  });
  return imageMeta?.og_url ?? display.src;
}

export function liveStoryMetadata(
  article: NewsArticleRow,
  options?: { imageMeta?: EditorialImageMeta | null; seoTitle?: string | null; seoDescription?: string | null }
): Metadata {
  const slug = resolveStorySlug(article);
  const title =
    options?.seoTitle?.trim() ||
    article.ai_headline?.trim() ||
    article.title;
  const description =
    options?.seoDescription?.trim() ||
    article.ai_summary?.trim() ||
    article.description?.trim() ||
    article.content?.slice(0, 160)?.trim() ||
    `${title} — ${BRAND.nameEn} live regional desk.`;

  const ogImage = resolveStoryOgImage(article, options?.imageMeta);
  const desk = mapProviderToDesk(resolveArticleProvider(article));
  const trending = buildTrendingKeywords({ limit: 6 });
  const newsKeywords = newsKeywordsForArticle({
    headline: title,
    category: article.category,
    region: article.region,
    tags: [article.category, desk.name],
    trendingPool: trending,
  });

  const locale = article.language === "en" ? "en_IN" : "hi_IN";

  return buildPageMetadata({
    title,
    description,
    path: `/story/${slug}`,
    keywords: [
      article.category,
      article.region ?? "chhattisgarh",
      desk.name,
      BRAND.nameEn,
      ...trending.slice(0, 4),
    ],
    locale,
    alternateLocales: ["hi_IN", "en_IN"],
    ogImage,
    ogType: "article",
    publishedTime: article.published_at,
    modifiedTime: resolveNewsArticleModifiedAt(article),
    section: article.category,
    newsKeywords,
  });
}

export function liveStoryJsonLd(
  article: NewsArticleRow,
  options?: { imageMeta?: EditorialImageMeta | null }
) {
  const slug = resolveStorySlug(article);
  const url = `${SITE_URL}/story/${slug}`;
  const headline = article.ai_headline?.trim() || article.title;
  const image = resolveStoryOgImage(article, options?.imageMeta);
  const breadcrumbs = buildStoryBreadcrumbs({
    category: article.category,
    headline,
    slug,
  });

  const wordCount = (article.content ?? article.description ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const trending = buildTrendingKeywords({ limit: 6 });

  return liveNewsArticleJsonLd({
    article,
    url,
    headline,
    description: article.ai_summary ?? article.description,
    image,
    breadcrumbs,
    keywords: newsKeywordsForArticle({
      headline,
      category: article.category,
      region: article.region,
      trendingPool: trending,
    }),
    isLive: isArticleLive(article.published_at),
    wordCount,
  });
}

/** @deprecated use liveStoryJsonLd — returns first graph only */
export function liveStoryJsonLdLegacy(article: NewsArticleRow) {
  const graphs = liveStoryJsonLd(article);
  return Array.isArray(graphs) ? graphs[0] : graphs;
}
