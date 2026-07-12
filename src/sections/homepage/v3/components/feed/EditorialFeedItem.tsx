"use client";

import { memo } from "react";
import { formatHomeTime } from "@/lib/homepage/format";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { EditorialFeedItem as EditorialFeedItemType } from "../../lib/editorial-feed-rhythm";
import { FeedLeadCard } from "./FeedLeadCard";
import { FeedStandardCard } from "./FeedStandardCard";
import { FeedCompactCard } from "./FeedCompactCard";
import { FeedLiveCard } from "./FeedLiveCard";

type EditorialFeedItemProps = {
  item: EditorialFeedItemType;
  language: NewsroomLanguage;
  liveLabel: string;
  updatesLabel: string;
  priorityImage?: boolean;
  showCompactDivider?: boolean;
};

export const EditorialFeedItem = memo(function EditorialFeedItem({
  item,
  language,
  liveLabel,
  updatesLabel,
  priorityImage = false,
  showCompactDivider = true,
}: EditorialFeedItemProps) {
  const { article, layout, updateCount } = item;
  const href = `/story/${article.slug}`;
  const publishedAt = formatHomeTime(article.publishedAt, language);
  const imageUrl = article.imageUrl || article.ogImageUrl;
  const category = article.categoryLabel || article.section;

  switch (layout) {
    case "lead":
      return (
        <FeedLeadCard
          headline={article.headline}
          summary={article.summary}
          imageUrl={imageUrl}
          imageAlt={article.headline}
          category={category}
          publishedAt={publishedAt}
          readingTime={article.readingTime}
          href={href}
          priority={priorityImage}
        />
      );
    case "standard":
      return (
        <FeedStandardCard
          headline={article.headline}
          imageUrl={imageUrl}
          imageAlt={article.headline}
          category={category}
          publishedAt={publishedAt}
          readingTime={article.readingTime}
          href={href}
        />
      );
    case "compact":
      return (
        <FeedCompactCard
          headline={article.headline}
          category={category}
          publishedAt={publishedAt}
          href={href}
          showDivider={showCompactDivider}
        />
      );
    case "live":
      return (
        <FeedLiveCard
          headline={article.headline}
          publishedAt={publishedAt}
          updateCount={updateCount ?? 1}
          href={href}
          liveLabel={liveLabel}
          updatesLabel={updatesLabel}
        />
      );
    default:
      return null;
  }
});
