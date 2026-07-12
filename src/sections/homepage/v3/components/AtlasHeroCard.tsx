"use client";

import Link from "next/link";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { IMG_HERO_LEAD } from "@/design-system/components/editorial/image-sizes";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/design-system/utils/cn";

export type AtlasHeroCardProps = {
  headline: string;
  summary?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  category?: string;
  publishedAt?: string;
  readingTime?: string;
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
  publishedAt,
  readingTime,
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
        <div className="atlas-hero__meta">
          {category ? (
            <span className="atlas-hero__category">{category}</span>
          ) : null}
          {publishedAt ? (
            <time className="atlas-hero__time">{publishedAt}</time>
          ) : null}
          {readingTime ? (
            <span className="atlas-hero__read">{readingTime}</span>
          ) : null}
        </div>

        <h2 className="atlas-hero__headline">{headline}</h2>

        {summary ? <p className="atlas-hero__summary">{summary}</p> : null}
      </div>
    </Link>
  );
}
