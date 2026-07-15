"use client";

import Link from "next/link";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { IMG_HERO_LEAD } from "@/design-system/components/editorial/image-sizes";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/design-system/utils/cn";
import type { HomeArticle } from "@/lib/homepage/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { AtlasCardMeta } from "./AtlasCardMeta";

export type AtlasHeroCardProps = {
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
  className?: string;
};

/**
 * Atlas Phase 2A — split-layout hero (image above, typography below).
 * No overlay scrim, no gradients, edge-to-edge 16:9 media.
 */
export function AtlasHeroCard({
  headline,
  summary,
  imageUrl,
  imageAlt,
  category,
  article,
  language,
  districtLabel,
  href,
  priority = true,
  className,
}: AtlasHeroCardProps) {
  const resolvedCategory = category?.trim() || "news";

  return (
    <Link
      href={href}
      className={cn("atlas-hero", "jds-interactive", focusRingClass, className)}
    >
      <div className="atlas-hero__media">
        <JdsCardImage
          src={imageUrl}
          alt={imageAlt ?? headline}
          category={resolvedCategory}
          cropAspect="16:9"
          sizes={IMG_HERO_LEAD}
          priority={priority}
          className="atlas-hero__image"
        />
      </div>

      <div className="atlas-hero__body">
        <AtlasCardMeta
          article={article}
          language={language}
          category={category}
          districtLabel={districtLabel}
        />

        <h1 className="atlas-hero__headline">{headline}</h1>

        {summary ? <p className="atlas-hero__summary">{summary}</p> : null}
      </div>
    </Link>
  );
}
