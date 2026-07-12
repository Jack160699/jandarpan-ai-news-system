"use client";

import { memo } from "react";
import Link from "next/link";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { IMG_CARD_COMPACT } from "@/design-system/components/editorial/image-sizes";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/design-system/utils/cn";
import type { HomeArticle } from "@/lib/homepage/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { AtlasCardMeta } from "../AtlasCardMeta";

export type FeedStandardCardProps = {
  headline: string;
  imageUrl?: string | null;
  imageAlt?: string;
  category?: string;
  article: HomeArticle;
  language: NewsroomLanguage;
  districtLabel?: string;
  href: string;
};

export const FeedStandardCard = memo(function FeedStandardCard({
  headline,
  imageUrl,
  imageAlt,
  category,
  article,
  language,
  districtLabel,
  href,
}: FeedStandardCardProps) {
  const resolvedCategory = category?.trim() || "news";

  return (
    <Link
      href={href}
      className={cn(
        "atlas-feed-standard",
        "tap-target",
        "jds-interactive",
        focusRingClass
      )}
      aria-label={headline}
    >
      <div className="atlas-feed-standard__thumb">
        <JdsCardImage
          src={imageUrl}
          alt={imageAlt ?? headline}
          category={resolvedCategory}
          cropAspect="4:3"
          sizes={IMG_CARD_COMPACT}
          className="atlas-feed-standard__image"
        />
      </div>

      <div className="atlas-feed-standard__content">
        <h3 className="atlas-feed-standard__headline">{headline}</h3>
        <AtlasCardMeta
          article={article}
          language={language}
          category={category}
          districtLabel={districtLabel}
        />
      </div>
    </Link>
  );
});
