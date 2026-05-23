"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import { widthFromSizes } from "@/lib/images/homepage-sizes";
import {
  aspectClassName,
  normalizeMediaAspect,
  type MediaAspect,
  type ThumbAspect,
} from "@/lib/news/images/aspects";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";
import { resolveMedia } from "@/lib/news/images/resolve-media";

type LoadTier = 0 | 1 | 2 | 3;

export type MediaImageProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  aspect?: ThumbAspect;
  category?: string;
  source?: string | null;
  articleUrl?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  /** Extra scrim for text-on-image */
  cinematic?: boolean;
  /** Parent supplies aspect box (e.g. .nr-card__media) */
  fillParent?: boolean;
};

function tierUrl(
  media: ReturnType<typeof resolveMedia>,
  tier: LoadTier
): string {
  switch (tier) {
    case 0:
      return media.optimizedUrl;
    case 1:
      return media.fallbackUrl;
    case 2:
      return media.placeholderUrl;
    default:
      return "";
  }
}

export function MediaImage({
  src,
  alt,
  sizes,
  aspect = "16:9",
  category,
  source,
  articleUrl,
  priority = false,
  className = "",
  imageClassName = "",
  cinematic = true,
  fillParent = false,
}: MediaImageProps) {
  const aspectNorm = normalizeMediaAspect(aspect);
  const width = widthFromSizes(sizes);
  const [tier, setTier] = useState<LoadTier>(0);
  const [loaded, setLoaded] = useState(false);

  const media = useMemo(() => {
    if (category) {
      return resolveMedia(
        {
          imageUrl: src,
          category,
          source,
          articleUrl,
        },
        aspectNorm === "fill" ? "16:9" : aspectNorm
      );
    }
    const url = src?.trim();
    if (!url) return null;
    const optimized = optimizeCdnUrl(url, {
      width,
      aspect: aspectNorm === "fill" ? "16:9" : aspectNorm,
    });
    return {
      url,
      optimizedUrl: optimized,
      fallbackUrl: optimized,
      placeholderUrl: optimized,
      isSynthetic: false,
    };
  }, [src, category, source, articleUrl, aspectNorm, width]);

  const displaySrc = media ? tierUrl(media, tier) : "";
  const showImage = Boolean(displaySrc) && tier < 3;

  const handleError = useCallback(() => {
    setLoaded(false);
    setTier((t) => {
      if (!media) return 3;
      if (t === 0) {
        if (media.fallbackUrl === media.optimizedUrl) {
          return media.placeholderUrl === media.optimizedUrl ? 3 : 2;
        }
        return 1;
      }
      if (t === 1) {
        return media.placeholderUrl === media.fallbackUrl ? 3 : 2;
      }
      return 3;
    });
  }, [media]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const frameClass =
    fillParent || aspectNorm === "fill"
      ? "media-frame media-frame--fill"
      : `media-frame ${aspectClassName(aspectNorm)}`;

  const imgPosClass =
    aspectNorm === "4:5"
      ? "media-frame__img--4-5"
      : "media-frame__img--16-9";

  return (
    <div className={`${frameClass} ${className}`.trim()}>
      <div className="media-frame__inner">
        {showImage ? (
          <>
            {!loaded ? (
              <span className="media-frame__skeleton" aria-hidden />
            ) : null}
            <Image
              key={displaySrc}
              src={displaySrc}
              alt={alt}
              fill
              priority={priority}
              fetchPriority={priority ? "high" : "auto"}
              loading={priority ? undefined : "lazy"}
              placeholder="blur"
              blurDataURL={IMAGE_BLUR}
              sizes={sizes}
              quality={priority ? 82 : 74}
              className={`media-frame__img ${imgPosClass} ${imageClassName} ${loaded ? "media-frame__img--loaded" : "media-frame__img--loading"}`.trim()}
              onLoad={handleLoad}
              onError={handleError}
            />
            {cinematic ? (
              <span
                className="media-frame__scrim media-frame__scrim--cinematic"
                aria-hidden
              />
            ) : (
              <span
                className="media-frame__scrim media-frame__scrim--contrast"
                aria-hidden
              />
            )}
          </>
        ) : (
          <div className="media-frame__fallback" aria-hidden>
            <span className="media-frame__fallback-mark" />
          </div>
        )}
      </div>
    </div>
  );
}
