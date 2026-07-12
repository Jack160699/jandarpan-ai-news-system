"use client";

import { memo } from "react";
import Link from "next/link";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { IMG_CARD_LEAD } from "@/design-system/components/editorial/image-sizes";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/design-system/utils/cn";
import type { HomeArticle } from "@/lib/homepage/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { AtlasCardMeta } from "../AtlasCardMeta";

export type FeedLeadCardProps = {
  headline: string;
  summary?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  category?: string;
  article: HomeArticle;
  language: NewsroomLanguage;
  districtLabel?: string;
  href: string;
  priority?: boolean;
};

export const FeedLeadCard = memo(function FeedLeadCard({
  headline,
  summary,
  imageUrl,
  imageAlt,
  category,
  article,
  language,
  districtLabel,
  href,
  priority = false,
}: FeedLeadCardProps) {
  const resolvedCategory = category?.trim() || "news";

  return (
    <Link
      href={href}
      className={cn(
        "atlas-feed-lead",
        "tap-target",
        "jds-interactive",
        focusRingClass
      )}
      aria-label={headline}
    >
      <div className="atlas-feed-lead__media">
        <JdsCardImage
          src={imageUrl}
          alt={imageAlt ?? headline}
          category={resolvedCategory}
          cropAspect="16:9"
          sizes={IMG_CARD_LEAD}
          priority={priority}
          className="atlas-feed-lead__image"
        />
      </div>

      <div className="atlas-feed-lead__body">
        <AtlasCardMeta
          article={article}
          language={language}
          category={category}
          districtLabel={districtLabel}
        />

        <h3 className="atlas-feed-lead__headline">{headline}</h3>

        {summary ? <p className="atlas-feed-lead__summary">{summary}</p> : null}
      </div>
    </Link>
  );
});
