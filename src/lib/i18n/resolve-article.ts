/**
 * Resolve generated article fields for reader language
 */

import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import type { ArticleTranslations } from "@/lib/i18n/multilingual/types";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";

export type LocalizedArticleFields = {
  headline: string;
  summary: string;
  articleBody: string;
  seoTitle: string;
  seoDescription: string;
  readingTime: string | null;
  language: NewsroomLanguage;
  usedTranslation: boolean;
};

export function getArticleTranslations(
  meta: EditorialMetadata | null | undefined
): ArticleTranslations {
  return (meta?.translations as ArticleTranslations) ?? {};
}

export function resolveLocalizedFields(
  row: GeneratedArticleRow,
  displayLanguage: NewsroomLanguage
): LocalizedArticleFields {
  const source = normalizeArticleLanguage(row.language);
  const translations = getArticleTranslations(row.editorial_metadata);

  if (displayLanguage === source) {
    return {
      headline: row.headline,
      summary: row.summary ?? "",
      articleBody: row.article_body ?? "",
      seoTitle: row.seo_title ?? row.headline,
      seoDescription: row.seo_description ?? row.summary ?? "",
      readingTime: row.reading_time,
      language: source,
      usedTranslation: false,
    };
  }

  const bundle = translations[displayLanguage];
  if (bundle) {
    return {
      headline: bundle.headline,
      summary: bundle.summary,
      articleBody: bundle.article_body ?? row.article_body ?? "",
      seoTitle: bundle.seo_title,
      seoDescription: bundle.seo_description,
      readingTime: bundle.reading_time,
      language: displayLanguage,
      usedTranslation: true,
    };
  }

  return {
    headline: row.headline,
    summary: row.summary ?? "",
    articleBody: row.article_body ?? "",
    seoTitle: row.seo_title ?? row.headline,
    seoDescription: row.seo_description ?? row.summary ?? "",
    readingTime: row.reading_time,
    language: source,
    usedTranslation: false,
  };
}

export function applyLocalizedFieldsToNewsArticle(
  article: NewsArticleRow,
  fields: LocalizedArticleFields
): NewsArticleRow {
  return {
    ...article,
    title: fields.headline,
    ai_headline: fields.headline,
    description: fields.summary,
    ai_summary: fields.summary,
    content: fields.articleBody || article.content,
    language: fields.language,
  };
}
