"use client";

import { FeedNewsCard } from "@/components/feed/FeedNewsCard";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

export type StoryCardVariant =
  | "editorial-lead"
  | "editorial"
  | "wire"
  | "breaking"
  | "compact"
  | "trending";

type StoryCardProps = {
  article: HomeArticle;
  variant: StoryCardVariant;
  priority?: boolean;
  rank?: number;
  showFreshBadge?: boolean;
};

function mapVariant(
  variant: StoryCardVariant
): "standard" | "compact" | "lead" {
  if (variant === "editorial-lead") return "lead";
  if (variant === "compact") return "compact";
  return "standard";
}

export function StoryCard({
  article,
  variant,
  priority = false,
  rank,
  showFreshBadge = false,
}: StoryCardProps) {
  const { t } = useLanguage();
  const feedVariant = mapVariant(variant);
  const showSummary =
    variant === "editorial-lead" ||
    variant === "editorial" ||
    variant === "breaking";

  return (
    <FeedNewsCard
      articleId={article.id}
      slug={article.slug}
      headline={article.headline}
      summary={article.summary}
      imageUrl={variant === "wire" ? undefined : article.imageUrl}
      categoryLabel={article.categoryLabel}
      publishedAt={article.publishedAt}
      readingTime={article.readingTime}
      language={article.language}
      section={article.section}
      imageCategory={article.tags[0] ?? article.section}
      variant={feedVariant}
      priority={priority}
      rank={variant === "trending" ? rank : undefined}
      showSummary={showSummary}
      isLive={article.isLive}
      isBreaking={article.ranking.isBreaking || variant === "breaking"}
      badge={
        showFreshBadge
          ? t.home.fresh
          : undefined
      }
      aiConfidence={article.aiConfidence}
      langHint={article.language === "hi" ? "hi-IN" : "auto"}
      surface={variant === "breaking" ? "breaking" : "homepage"}
      listPosition={rank}
    />
  );
}
