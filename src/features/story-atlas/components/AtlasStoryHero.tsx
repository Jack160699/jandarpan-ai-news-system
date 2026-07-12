"use client";

import { memo } from "react";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { IMG_HERO_LEAD } from "@/design-system/components/editorial/image-sizes";

type AtlasStoryHeroProps = {
  src: string;
  fallbackSrc?: string;
  alt: string;
  category?: string;
  sizes?: string;
};

export const AtlasStoryHero = memo(function AtlasStoryHero({
  src,
  fallbackSrc,
  alt,
  category,
  sizes = IMG_HERO_LEAD,
}: AtlasStoryHeroProps) {
  const imageUrl = src?.trim() || fallbackSrc?.trim();

  return (
    <figure className="atlas-story-hero">
      <div className="atlas-story-hero__media">
        <JdsCardImage
          src={imageUrl}
          alt={alt}
          category={category ?? "news"}
          cropAspect="16:9"
          sizes={sizes}
          priority
          className="atlas-story-hero__image"
        />
      </div>
    </figure>
  );
});
