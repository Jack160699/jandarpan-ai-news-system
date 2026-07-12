"use client";

import { memo } from "react";
import Link from "next/link";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/design-system/utils/cn";
import type { HomeArticle } from "@/lib/homepage/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { AtlasTrustRow } from "../AtlasTrustRow";

export type FeedCompactCardProps = {
  headline: string;
  category?: string;
  article: HomeArticle;
  language: NewsroomLanguage;
  districtLabel?: string;
  href: string;
  showDivider?: boolean;
};

export const FeedCompactCard = memo(function FeedCompactCard({
  headline,
  category,
  article,
  language,
  districtLabel,
  href,
  showDivider = true,
}: FeedCompactCardProps) {
  return (
    <>
      {showDivider ? <hr className="atlas-feed__divider" aria-hidden /> : null}
      <Link
        href={href}
        className={cn(
          "atlas-feed-compact",
          "tap-target",
          "jds-interactive",
          focusRingClass
        )}
        aria-label={headline}
      >
        {category ? (
          <span className="atlas-feed-compact__badge">{category}</span>
        ) : null}
        <h3 className="atlas-feed-compact__headline">{headline}</h3>
        <AtlasTrustRow
          article={article}
          language={language}
          districtLabel={districtLabel}
          className="atlas-feed-compact__trust"
        />
      </Link>
    </>
  );
});
