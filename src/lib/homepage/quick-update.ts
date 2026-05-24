import { resolveWireLocation } from "@/lib/homepage/wire-location";
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

export function homeArticleToQuickUpdate(article: HomeArticle): QuickUpdateData {
  const fresh = isQuickUpdateFresh(article);
  const isLive = article.isLive;
  const isBreaking =
    article.ranking.isBreaking || article.urgency === "high" || fresh;

  const updateLine =
    article.summary?.trim() ||
    `${article.categoryLabel} · ${article.desk.nameHi || article.desk.name}`;

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
    location: resolveWireLocation(article),
  };
}
