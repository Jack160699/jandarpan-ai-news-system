import type { HomeArticle, HomeSectionId } from "@/lib/homepage/types";
import type { PlatformArticle } from "./types";

const CATEGORY_TO_SECTION: Partial<Record<string, HomeSectionId>> = {
  district_news: "chhattisgarh",
  national_news: "india",
  international_news: "world",
  breaking_news: "chhattisgarh",
  jobs: "business",
  sports: "sports",
  markets: "business",
  education: "education",
  tech: "business",
  fact_checks: "india",
  yojana: "chhattisgarh",
};

export function platformArticleToHomeArticle(article: PlatformArticle): HomeArticle {
  const section =
    CATEGORY_TO_SECTION[article.category] ??
    (article.district === "raipur" ? "raipur" : "chhattisgarh");

  return {
    id: article.id,
    slug: article.slug,
    headline: article.title,
    summary: article.excerpt,
    imageUrl: article.image,
    ogImageUrl: article.image,
    section,
    readingTime: "3 min read",
    publishedAt: article.publishedAt,
    isLive: article.breaking,
    urgency: article.breaking ? "high" : article.priority > 70 ? "medium" : "low",
    trendScore: article.trendingScore,
    priorityScore: article.priority,
    ranking: {
      priorityScore: article.priority,
      reasons: [article.category],
      isTrending: article.trendingScore > 65,
      isBreaking: article.breaking,
      duplicateClusterId: null,
    },
    language: article.language,
    tags: article.tags,
    aiConfidence: 0.85,
    sourceCount: 1,
    categoryLabel: article.category.replace(/_/g, " "),
    desk: "State Desk",
    localeMatch: true,
  };
}

export function platformArticlesToHomeArticles(
  articles: PlatformArticle[]
): HomeArticle[] {
  return articles.map(platformArticleToHomeArticle);
}
