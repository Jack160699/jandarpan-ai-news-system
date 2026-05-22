import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";
import { formatPublishedAt } from "@/lib/news-db";
import { resolveCardImage } from "@/lib/news/images/display";

/** Display props shared by live news cards (maps DB → UI) */
export type LiveCardModel = {
  id: string;
  title: string;
  excerpt: string;
  /** Always a valid, display-ready image URL */
  imageUrl: string;
  category: string;
  source: string | null;
  filedAt: string;
  href: string;
};

export function liveArticleToCard(article: NewsArticleRow): LiveCardModel {
  const category = article.category;
  const width =
    category === "local" || category === "politics" ? 720 : 640;

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
    source: article.source,
    filedAt: formatPublishedAt(article.published_at),
    href: `/article/${article.id}`,
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
