import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { ArticleMeta, Badge } from "@/design-system";
import type { ArticleV3HeroProps } from "../types";

export function ArticleHero({
  headline,
  categoryLabel,
  regionLabel,
  readTime,
  publishedAtLabel,
  isLive,
  desk,
  imageSrc,
  imageFallbackSrc,
  imageSizes,
  imageCredit,
}: ArticleV3HeroProps) {
  return (
    <header className="article-v3-hero">
      <div className="article-v3-hero__meta-row">
        <Badge variant="brand">{categoryLabel}</Badge>
        {isLive ? <Badge variant="breaking">Live</Badge> : null}
        {regionLabel ? <Badge variant="default">{regionLabel}</Badge> : null}
      </div>

      <h1 className="article-v3-hero__headline">{headline}</h1>

      <ArticleMeta
        publishedAt={publishedAtLabel ?? undefined}
        readTime={readTime}
        source={desk ?? undefined}
      />

      <figure className="article-v3-hero__media">
        <HomeArticleImage
          src={imageSrc}
          fallbackSrc={imageFallbackSrc}
          priority
          sizes={imageSizes}
          alt=""
          aspectClassName="article-v3-hero__image"
        />
        {imageCredit ? (
          <figcaption className="article-v3-hero__credit">{imageCredit}</figcaption>
        ) : null}
      </figure>
    </header>
  );
}
