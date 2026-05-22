import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";

type StoryHeroImageProps = {
  src: string;
  alt?: string;
};

export function StoryHeroImage({ src, alt = "" }: StoryHeroImageProps) {
  return (
    <figure className="immersive-story__hero">
      <HomeArticleImage
        src={src}
        alt={alt}
        priority
        sizes="(max-width: 768px) 100vw, 48rem"
      />
    </figure>
  );
}
