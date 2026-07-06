/**
 * Multilingual SEO — hreflang, alternates, localized metadata
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/constants";
import { buildPageMetadata } from "@/lib/seo/metadata";
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

  const base = buildPageMetadata({
    title: fields.seoTitle,
    description: fields.seoDescription,
    path,
    locale: config.ogLocale,
    alternateLocales: NEWSROOM_LANGUAGES.map((l) => getLanguageConfig(l).ogLocale),
    ogImage: options?.ogImage,
    ogType: "article",
    publishedTime: row.published_at,
    modifiedTime: row.created_at,
    section: row.tags[0],
  });

  return {
    ...base,
    alternates: {
      canonical: path,
      languages: buildStoryLanguageAlternates(slug, row),
    },
  };
}
