"use client";

import { memo } from "react";
import Image from "next/image";
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
  return (
    <figure className={cn("atlas-story-inline-image", className)}>
      <div className="atlas-story-inline-image__frame">
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={675}
          sizes="(max-width: 768px) 100vw, 720px"
          className="atlas-story-inline-image__img"
          loading="lazy"
        />
      </div>
      {alt ? <figcaption className="sr-only">{alt}</figcaption> : null}
    </figure>
  );
});
