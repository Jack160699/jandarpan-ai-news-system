"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { shouldUseNativeImage } from "@/lib/images/next-image-policy";
import { cn } from "@/design-system/utils/cn";

type AtlasStoryImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export const AtlasStoryImage = memo(function AtlasStoryImage({
  src,
  alt,
  className,
}: AtlasStoryImageProps) {
  const [native, setNative] = useState(() => shouldUseNativeImage(src));

  return (
    <figure className={cn("atlas-story-inline-image", className)}>
      <div className="atlas-story-inline-image__frame">
        {native ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="atlas-story-inline-image__img"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={675}
            sizes="(max-width: 768px) 100vw, 720px"
            className="atlas-story-inline-image__img"
            loading="lazy"
            onError={() => setNative(true)}
          />
        )}
      </div>
      {alt ? <figcaption className="sr-only">{alt}</figcaption> : null}
    </figure>
  );
});
