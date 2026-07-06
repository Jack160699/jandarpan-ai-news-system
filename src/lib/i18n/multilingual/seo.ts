/**
 * Multilingual SEO — hreflang, alternates, localized metadata
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/constants";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  buildTrendingKeywords,
  newsKeywordsForArticle,
} from "@/lib/seo/trending-keywords";
import { resolveGeneratedArticleModifiedAt } from "@/lib/seo/article-dates";
import {
  getLanguageConfig,
  NEWSROOM_LANGUAGES,
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import {
  getArticleTranslations,
  resolveLocalizedFields,
} from "@/lib/i18n/resolve-article";
import type { ArticleTranslations } from "@/lib/i18n/multilingual/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export function buildStoryLanguageAlternates(
  slug: string,
  row: GeneratedArticleRow
): Record<string, string> {
  const path = `/story/${slug}`;
  const base = `${SITE_URL}${path}`;
  const source = normalizeArticleLanguage(row.language);
  const translations = getArticleTranslations(
    row.editorial_metadata,
    row.translations as ArticleTranslations | null
  );

  const languages: Record<string, string> = {
    [getLanguageConfig(source).hreflang]: base,
    "x-default": base,
  };

  for (const lang of NEWSROOM_LANGUAGES) {
    if (lang === source || translations[lang]) {
      languages[getLanguageConfig(lang).hreflang] = `${base}?lang=${lang}`;
    }
  }

  return languages;
}

export function buildLocalizedStoryMetadata(
  row: GeneratedArticleRow,
  options?: {
    displayLanguage?: NewsroomLanguage;
    imageMeta?: { og_url?: string } | null;
    ogImage?: string;
  }
): Metadata {
  const lang =
    options?.displayLanguage ?? normalizeArticleLanguage(row.language);
  const fields = resolveLocalizedFields(row, lang);
  const slug = row.slug;
  const path = `/story/${slug}`;
  const config = getLanguageConfig(lang);

  const trending = buildTrendingKeywords({ limit: 6 });
  const newsKeywords = newsKeywordsForArticle({
    headline: fields.seoTitle,
    category: row.tags[0] ?? "local",
    region:
      (row.geo_metadata as { region?: string } | null | undefined)?.region ??
      "chhattisgarh",
    tags: row.tags,
    trendingPool: trending,
  });
  const modifiedTime = resolveGeneratedArticleModifiedAt(row);
  const canonical = `${SITE_URL}${path}`;

  const base = buildPageMetadata({
    title: fields.seoTitle,
    description: fields.seoDescription,
    path,
    locale: config.ogLocale,
    alternateLocales: NEWSROOM_LANGUAGES.map((l) => getLanguageConfig(l).ogLocale),
    ogImage: options?.ogImage,
    ogType: "article",
    publishedTime: row.published_at,
    modifiedTime,
    section: row.tags[0],
    newsKeywords,
  });

  return {
    ...base,
    alternates: {
      canonical,
      languages: buildStoryLanguageAlternates(slug, row),
    },
  };
}
