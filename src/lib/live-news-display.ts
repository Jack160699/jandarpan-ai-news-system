import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";
import { formatPublishedAt } from "@/lib/news-db";

/** Display props shared by live news cards (maps DB → UI) */
export type LiveCardModel = {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  category: string;
  source: string | null;
  filedAt: string;
  href: string;
};

export function liveArticleToCard(article: NewsArticleRow): LiveCardModel {
  return {
    id: article.id,
    title: article.title,
    excerpt:
      article.description?.trim() ||
      article.content?.slice(0, 160)?.trim() ||
      "",
    imageUrl: article.image_url,
    category: article.category,
    source: article.source,
    filedAt: formatPublishedAt(article.published_at),
    href: `/article/${article.id}`,
  };
}

export function categoryLabel(category: NewsCategory): string {
  const labels: Record<NewsCategory, string> = {
    business: "Business",
    technology: "Technology",
    sports: "Sports",
    entertainment: "Entertainment",
    health: "Health",
  };
  return labels[category] ?? category;
}
