import type { NewsroomLanguage } from "@/lib/i18n/languages";

export type ArticleLocaleBundle = {
  headline: string;
  summary: string;
  article_body?: string;
  seo_title: string;
  seo_description: string;
  reading_time: string;
  translated_at: string;
  model?: string;
  tone_profile?: string;
};

export type ArticleTranslations = Partial<
  Record<NewsroomLanguage, ArticleLocaleBundle>
>;

export type TranslationStatus = "pending" | "completed" | "failed";

export type TranslationJobResult = {
  language: NewsroomLanguage;
  ok: boolean;
  error?: string;
};
