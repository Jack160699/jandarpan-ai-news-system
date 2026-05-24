import { resolveWireLocation } from "@/lib/homepage/wire-location";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickDeskLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";

export type QuickUpdateData = {
  id: string;
  slug: string;
  section: HomeArticle["section"];
  headline: string;
  updateLine: string;
  publishedAt: string;
  language?: string;
  isLive: boolean;
  isBreaking: boolean;
  location?: string;
};

export function isQuickUpdateFresh(article: HomeArticle): boolean {
  const hours =
    (Date.now() - new Date(article.publishedAt).getTime()) / 3_600_000;
  return hours < 2;
}

export function homeArticleToQuickUpdate(
  article: HomeArticle,
  language: NewsroomLanguage = "hi"
): QuickUpdateData {
  const fresh = isQuickUpdateFresh(article);
  const isLive = article.isLive;
  const isBreaking =
    article.ranking.isBreaking || article.urgency === "high" || fresh;

  const updateLine =
    article.summary?.trim() ||
    `${article.categoryLabel} · ${pickDeskLabel(language, article.desk)}`;

  return {
    id: article.id,
    slug: article.slug,
    section: article.section,
    headline: article.headline,
    updateLine,
    publishedAt: article.publishedAt,
    language: article.language,
    isLive,
    isBreaking: isBreaking && !isLive,
    location: resolveWireLocation(article, language),
  };
}
