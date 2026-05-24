"use client";

import { FeedNewsCard } from "@/components/feed/FeedNewsCard";
import type { LiveCardModel } from "@/lib/live-news-display";
import { categoryLabel } from "@/lib/live-news-display";
import type { NewsCategory } from "@/lib/types/news-article";

type LiveNewsCardProps = {
  article: LiveCardModel;
  variant?: "horizontal" | "featured" | "compact";
  priority?: boolean;
  showExcerpt?: boolean;
};

export function LiveNewsCard({
  article,
  variant = "horizontal",
  priority = false,
  showExcerpt = false,
}: LiveNewsCardProps) {
  const catLabel = categoryLabel(article.category as NewsCategory);
  const feedVariant =
    variant === "featured" ? "lead" : variant === "compact" ? "compact" : "standard";

  return (
    <FeedNewsCard
      articleId={article.id}
      slug={article.id}
      href={article.href}
      headline={article.title}
      summary={article.excerpt}
      imageUrl={article.imageUrl}
      categoryLabel={catLabel}
      publishedLabel={article.filedAt}
      sourceLabel={article.source ?? undefined}
      section={article.category}
      imageCategory={article.category}
      variant={feedVariant}
      priority={priority}
      showSummary={showExcerpt || variant === "featured"}
      isLive={article.isLive}
      isBreaking={article.isBreaking}
      surface="homepage"
    />
  );
}
