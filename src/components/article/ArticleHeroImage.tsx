import Image from "next/image";
import { IMAGE_BLUR } from "@/lib/image-placeholder";

type ArticleHeroImageProps = {
  src: string;
  credit?: string;
  priority?: boolean;
};

export function ArticleHeroImage({
  src,
  credit,
  priority = true,
}: ArticleHeroImageProps) {
  return (
    <figure className="article-figure">
      <div className="article-figure__media">
        <Image
          src={src}
          alt=""
          fill
          priority={priority}
          placeholder="blur"
          blurDataURL={IMAGE_BLUR}
          sizes="(max-width: 768px) 100vw, 48rem"
          className="image-ink object-cover"
        />
      </div>
      {credit ? (
        <figcaption className="article-figure__caption">{credit}</figcaption>
      ) : null}
    </figure>
  );
}
