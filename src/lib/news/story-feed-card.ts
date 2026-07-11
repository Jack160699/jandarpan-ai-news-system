import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { displayCategoryLabel } from "@/lib/news/category-display";
import { resolveCardImage } from "@/lib/news/images/display";
import { isArticleLive } from "@/lib/news/home-ranking";
import { resolveArticleProvider } from "@/lib/news/article-provider";
import { resolveStorySlug } from "@/lib/news/related-stories";
import { estimateReadTime } from "@/lib/news/story-utils";
import { mapProviderToDesk } from "@/lib/newsroom/desk-branding";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

export type StoryFeedCardModel = {
  slug: string;
  href: string;
  headline: string;
  imageUrl: string;
  categoryLabel: string;
  metaLabel: string;
  isLive: boolean;
};

/** Client-safe mapper for related-story cards */
export function mapNewsArticleToStoryFeedCard(
  article: NewsArticleRow,
  language: NewsroomLanguage,
  imageWidth = 480
): StoryFeedCardModel {
  const slug = resolveStorySlug(article);
  const imageUrl = resolveCardImage(
    {
      imageUrl: article.image_url,
      category: article.category,
      source: article.source,
      articleUrl: article.article_url,
    },
    imageWidth
  );
  const readTime = estimateReadTime(
    `${article.title} ${article.content ?? article.description ?? ""}`
  );
  const desk = mapProviderToDesk(resolveArticleProvider(article));

  return {
    slug,
    href: `/story/${slug}`,
    headline: article.ai_headline ?? article.title,
    imageUrl,
    categoryLabel: displayCategoryLabel(
      article.category as NewsCategory,
      language
    ),
    metaLabel: `${desk.name} · ${readTime}`,
    isLive: isArticleLive(article.published_at),
  };
}
