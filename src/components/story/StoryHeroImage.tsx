import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { buildResponsiveSizes } from "@/lib/news/images/responsive-sizes";

type StoryHeroImageProps = {
  src: string;
  alt: string;
  fallbackSrc?: string;
  sizes?: string;
};

export function StoryHeroImage({
  src,
  alt,
  fallbackSrc,
  sizes = buildResponsiveSizes(),
}: StoryHeroImageProps) {
  return (
    <figure className="immersive-story__hero story-hero">
      <div className="story-hero__frame">
        <HomeArticleImage
          src={src}
          alt={alt}
          fallbackSrc={fallbackSrc}
          priority
          sizes={sizes}
          aspectClassName="story-hero__image-wrap"
        />
      </div>
      {alt ? (
        <figcaption className="story-hero__caption">{alt}</figcaption>
      ) : null}
    </figure>
  );
}
