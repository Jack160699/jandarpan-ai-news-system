import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { DeskBadge } from "@/components/homepage/DeskBadge";
import type { StoryAttribution } from "@/lib/news/story-view";
import type { NewsDeskLabel } from "@/lib/newsroom/desk-branding";

type StoryCinematicHeroProps = {
  src: string;
  fallbackSrc?: string;
  sizes?: string;
  headline: string;
  categoryLabel: string;
  regionLabel: string;
  attribution: StoryAttribution;
  readTime: string;
  publishedAtIso?: string | null;
  publishedAtLabel?: string | null;
  isLive?: boolean;
  desk: NewsDeskLabel;
  imageCredit?: string | null;
};

export function StoryCinematicHero({
  src,
  fallbackSrc,
  sizes,
  headline,
  categoryLabel,
  regionLabel,
  attribution,
  readTime,
  publishedAtIso,
  publishedAtLabel,
  isLive = false,
  desk,
  imageCredit,
}: StoryCinematicHeroProps) {
  return (
    <header className="story-cinematic" aria-labelledby="story-cinematic-title">
      <div className="story-cinematic__media">
        <HomeArticleImage
          src={src}
          fallbackSrc={fallbackSrc}
          priority
          sizes={sizes ?? "(max-width: 768px) 100vw, 72rem"}
          alt=""
          aspectClassName="story-cinematic__image-wrap"
        />
        <div className="story-cinematic__shade" aria-hidden />
        <div className="story-cinematic__grain" aria-hidden />
        {imageCredit ? (
          <p className="story-cinematic__caption">{imageCredit}</p>
        ) : null}
      </div>

      <div className="story-cinematic__overlay">
        <div className="story-cinematic__meta-row">
          <span className="story-cinematic__category">{categoryLabel}</span>
          <span className="story-cinematic__region">{regionLabel}</span>
          {isLive ? (
            <span className="story-cinematic__live">
              <span className="story-cinematic__live-dot" aria-hidden />
              LIVE
            </span>
          ) : null}
        </div>

        <h1
          id="story-cinematic-title"
          className="story-cinematic__headline"
        >
          {headline}
        </h1>

        <div className="story-cinematic__byline">
          <DeskBadge desk={desk} variant="editorial" />
          <p className="story-cinematic__source">
            <span className="story-cinematic__author">{attribution.author}</span>
            <span aria-hidden> · </span>
            <span>{attribution.sourceLine}</span>
          </p>
          <p className="story-cinematic__timestamps">
            {publishedAtLabel ? (
              <time dateTime={publishedAtIso ?? undefined}>
                {publishedAtLabel}
              </time>
            ) : null}
            {publishedAtLabel ? <span aria-hidden> · </span> : null}
            <span>{readTime}</span>
            <span aria-hidden> · </span>
            <span>
              {attribution.sourceCount}{" "}
              {attribution.sourceCount === 1 ? "source" : "sources"}
            </span>
          </p>
        </div>
      </div>
    </header>
  );
}
