"use client";

import Image from "next/image";
import { useState } from "react";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import { isDisplayableImage } from "@/lib/news/images/validate";

type StoryInlineImageProps = {
  src: string;
  alt: string;
};

export function StoryInlineImage({ src, alt }: StoryInlineImageProps) {
  const [failed, setFailed] = useState(false);
  const valid = isDisplayableImage(src) && !failed;

  if (!valid) {
    return (
      <figure className="story-inline-figure story-inline-figure--fallback">
        <div className="story-inline-figure__fallback" aria-hidden />
        {alt ? (
          <figcaption className="story-inline-figure__caption">{alt}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="story-inline-figure">
      <div className="story-inline-figure__frame">
        <Image
          src={src}
          alt={alt}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 40rem"
          className="object-cover"
          placeholder="blur"
          blurDataURL={IMAGE_BLUR}
          onError={() => setFailed(true)}
        />
      </div>
      {alt ? (
        <figcaption className="story-inline-figure__caption">{alt}</figcaption>
      ) : null}
    </figure>
  );
}
