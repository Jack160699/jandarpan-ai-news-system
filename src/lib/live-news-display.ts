import { resolveArticleProvider } from "@/lib/news/article-provider";
import { isArticleLive } from "@/lib/news/home-ranking";
import {
  displaySourceLine,
  mapProviderToDesk,
} from "@/lib/newsroom/desk-branding";
import { resolveStorySlug } from "@/lib/news/related-stories";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";
import { formatPublishedAt } from "@/lib/news-db";
import { resolveCardImage } from "@/lib/news/images/display";
import { storyPath } from "@/lib/news/slug";

/** Display props shared by live news cards */
export type LiveCardModel = {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  source: string | null;
  filedAt: string;
  href: string;
  isLive: boolean;
  isBreaking: boolean;
};

const BREAKING_RE =
  /\bbreaking\b|\blive\b|\burgent\b|बड़ी खबर|ब्रेकिंग|लाइव/i;

export function liveArticleToCard(article: NewsArticleRow): LiveCardModel {
  const category = article.category;
  const width =
    category === "local" || category === "politics" ? 720 : 640;

  const text = `${article.title} ${article.description ?? ""}`;
  const desk = mapProviderToDesk(resolveArticleProvider(article));

  return {
    id: article.id,
    title: article.title,
    excerpt:
      article.description?.trim() ||
      article.content?.slice(0, 160)?.trim() ||
      "",
    imageUrl: resolveCardImage(
      {
        imageUrl: article.image_url,
        category: article.category,
        source: article.source,
        articleUrl: article.article_url,
      },
      width
    ),
    category: article.category,
    source: displaySourceLine(desk, article.source),
    filedAt: formatPublishedAt(article.published_at),
    href: storyPath(resolveStorySlug(article)),
    isLive: isArticleLive(article.published_at),
    isBreaking: BREAKING_RE.test(text),
  };
}

export function categoryLabel(category: NewsCategory): string {
  const labels: Record<NewsCategory, string> = {
    local: "Chhattisgarh",
    politics: "Politics",
    business: "Business",
    technology: "Technology",
    sports: "Sports",
    entertainment: "Entertainment",
    health: "Health",
    world: "World",
  };
  return labels[category] ?? category;
}
