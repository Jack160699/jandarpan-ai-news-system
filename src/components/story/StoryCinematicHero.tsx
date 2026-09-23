import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { DeskBadge } from "@/components/homepage/DeskBadge";
import { StoryMediaAttribution } from "./StoryMediaAttribution";
import type { StoryAttribution } from "@/lib/news/story-view";
import type { NewsDeskLabel } from "@/lib/newsroom/desk-branding";
import type { EditorialMediaRightsStatus } from "@/lib/media/media-record";

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
  imageCaption?: string | null;
  sourceUrl?: string | null;
  rightsStatus?: EditorialMediaRightsStatus | null;
};

/**
 * Editorial Newspaper Hero:
 * Category -> Headline -> Dateline/Byline -> Hero Media -> Caption/Credit
 */
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
  imageCaption,
  sourceUrl,
  rightsStatus,
}: StoryCinematicHeroProps) {
  return (
    <header className="story-editorial-hero mb-6" aria-labelledby="story-headline">
      {/* 1. Category & Region Header */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--jds-color-text-secondary,#666)]">
        <span className="bg-[var(--jds-color-brand-primary,#c41e24)] text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold">
          {categoryLabel}
        </span>
        {regionLabel && (
          <span className="text-[var(--jds-color-text-tertiary,#888)]">
            {regionLabel}
          </span>
        )}
        {isLive && (
          <span className="inline-flex items-center gap-1 text-red-600 font-bold ml-auto">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" aria-hidden />
            LIVE
          </span>
        )}
      </div>

      {/* 2. Headline */}
      <h1
        id="story-headline"
        className="story-headline text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--jds-color-text-primary,#111)] leading-tight mb-4 tracking-tight"
      >
        {headline}
      </h1>

      {/* 3. Dateline & Byline */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--jds-color-text-secondary,#555)] pb-4 mb-4 border-b border-[var(--jds-color-border-subtle,#e5e5e5)]">
        <DeskBadge desk={desk} variant="editorial" />
        <div className="flex items-center gap-1.5 font-medium">
          <span>{attribution.author}</span>
          <span aria-hidden>·</span>
          <span>{attribution.sourceLine}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-[var(--jds-color-text-tertiary,#777)]">
          {publishedAtLabel ? (
            <time dateTime={publishedAtIso ?? undefined}>{publishedAtLabel}</time>
          ) : null}
          {publishedAtLabel ? <span aria-hidden>·</span> : null}
          <span>{readTime}</span>
          <span aria-hidden>·</span>
          <span>
            {attribution.sourceCount}{" "}
            {attribution.sourceCount === 1 ? "source" : "sources"}
          </span>
        </div>
      </div>

      {/* 4. Large Hero Image */}
      {src ? (
        <figure className="story-hero-media m-0">
          <div className="relative w-full aspect-[16/9] max-h-[560px] overflow-hidden rounded-xl bg-black/5 shadow-sm border border-[var(--jds-color-border-subtle,rgba(0,0,0,0.06))]">
            <HomeArticleImage
              src={src}
              fallbackSrc={fallbackSrc}
              priority
              sizes={sizes ?? "(max-width: 1024px) 100vw, 840px"}
              alt={imageCaption || imageCredit ? `${headline} — ${imageCaption || imageCredit}` : headline}
              aspectClassName="w-full h-full object-cover"
            />
          </div>
          <StoryMediaAttribution
            caption={imageCaption}
            credit={imageCredit}
            sourceUrl={sourceUrl}
            rightsStatus={rightsStatus}
          />
        </figure>
      ) : null}
    </header>
  );
}
