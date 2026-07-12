"use client";

import { memo } from "react";
import Link from "next/link";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { IMG_CARD_COMPACT } from "@/design-system/components/editorial/image-sizes";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { NewsArticleRow } from "@/lib/types/news-article";
import { resolveStorySlug } from "@/lib/news/related-stories";

type AtlasStoryNextProps = {
  article: NewsArticleRow | null;
  language: NewsroomLanguage;
};

export const AtlasStoryNext = memo(function AtlasStoryNext({
  article,
  language,
}: AtlasStoryNextProps) {
  if (!article) return null;

  const slug = resolveStorySlug(article);
  const headline = article.ai_headline?.trim() || article.title;
  const title = pickBilingualLabel(language, "Read next", "अगली कहानी");

  return (
    <section className="atlas-story-next" aria-labelledby="atlas-story-next-title">
      <h2 id="atlas-story-next-title" className="atlas-story-next__label">
        {title}
      </h2>
      <Link href={`/story/${slug}`} className="atlas-story-next__card tap-target">
        <div className="atlas-story-next__thumb">
          <JdsCardImage
            src={article.image_url}
            alt={headline}
            category={article.category}
            cropAspect="16:9"
            sizes={IMG_CARD_COMPACT}
            className="atlas-story-next__image"
          />
        </div>
        <span className="atlas-story-next__headline">{headline}</span>
      </Link>
    </section>
  );
});
