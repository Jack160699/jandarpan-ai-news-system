import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { JsonObject } from "@/types/json";

export type EditorArticleRecord = {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  article_body: string | null;
  hero_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  language: string | null;
  tags: string[] | null;
  published_at: string | null;
  editorial_status: string | null;
  translations: JsonObject | null;
  editorial_metadata: JsonObject | null;
  created_at: string;
};

export type EditorVersionSnapshot = {
  id: string;
  savedAt: string;
  headline: string;
  summary: string;
  article_body: string;
  slug: string;
};

export type EditorSeoMeta = {
  canonicalUrl?: string;
  ogImage?: string;
  focusKeyword?: string;
  keywordSuggestions?: string[];
};

export type EditorDraftPayload = {
  slug: string;
  headline: string;
  summary: string;
  article_body: string;
  hero_image_url: string;
  seo_title: string;
  seo_description: string;
  language: NewsroomLanguage | string;
  tags: string[];
  published_at: string | null;
  translations: JsonObject;
  editorial_metadata: JsonObject;
};

export type EditorAiAction =
  | "rewrite"
  | "headlines"
  | "seo"
  | "grammar"
  | "summarize"
  | "translate"
  | "tone"
  | "tags";
