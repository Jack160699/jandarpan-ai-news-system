import { DeskBadge } from "@/components/homepage/DeskBadge";
import type { StoryAttribution as StoryAttributionModel } from "@/lib/news/story-view";

type StoryAttributionProps = {
  attribution: StoryAttributionModel;
  readTime: string;
  publishedAtIso?: string | null;
  publishedAtLabel?: string | null;
  isLive?: boolean;
};

export function StoryAttribution({
  attribution,
  readTime,
  publishedAtIso,
  publishedAtLabel,
  isLive = false,
}: StoryAttributionProps) {
  return (
    <div className="story-attribution">
      <div className="story-attribution__desks">
        <DeskBadge desk={attribution.desk} variant="editorial" />
        {isLive ? (
          <span className="story-attribution__live">
            <span className="story-attribution__live-dot" aria-hidden />
            Live
          </span>
        ) : null}
      </div>
      <p className="story-attribution__byline">
        <span className="story-attribution__author">{attribution.author}</span>
        <span aria-hidden> · </span>
        <span>{attribution.sourceLine}</span>
        <span aria-hidden> · </span>
        <span>
          {attribution.sourceCount}{" "}
          {attribution.sourceCount === 1 ? "source" : "sources"}
        </span>
      </p>
      <p className="story-attribution__meta">
        <span>{attribution.categoryLabel}</span>
        <span aria-hidden> · </span>
        <span>{attribution.regionLabel}</span>
        <span aria-hidden> · </span>
        <span>{readTime}</span>
        {publishedAtLabel ? (
          <>
            <span aria-hidden> · </span>
            <time dateTime={publishedAtIso ?? undefined}>
              {publishedAtLabel}
            </time>
          </>
        ) : null}
      </p>
    </div>
  );
}
