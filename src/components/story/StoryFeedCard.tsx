import Link from "next/link";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { ArticleMeta } from "@/design-system/components/ArticleMeta";
import { EditorialBadges } from "@/design-system/components/editorial/EditorialBadges";
import type { StoryFeedCardModel } from "@/lib/news/story-feed-card";

export type StoryFeedCardVariant = "rail" | "grid" | "row";

type StoryFeedCardProps = {
  card: StoryFeedCardModel;
  variant?: StoryFeedCardVariant;
  imageSizes?: string;
  priority?: boolean;
};

/**
 * @deprecated Legacy related-story card — uses design-system image, meta, and badge primitives.
 */
export function StoryFeedCard({
  card,
  variant = "grid",
  imageSizes = "(max-width:640px) 80vw, 320px",
  priority = false,
}: StoryFeedCardProps) {
  const feedVariant =
    variant === "row" ? "feed-news-card--compact" : "feed-news-card--standard";

  return (
    <article
      className={`feed-news-card story-feed-card story-feed-card--${variant} ${feedVariant}`}
    >
      <div className="feed-news-card__main">
        <Link href={card.href} className="feed-news-card__link tap-target">
          <div className="feed-news-card__media">
            <JdsCardImage
              src={card.imageUrl}
              alt={card.headline}
              sizes={imageSizes}
              priority={priority}
              className="feed-news-card__img"
            />
            <EditorialBadges variant="feed" isLive={card.isLive} liveLabel="LIVE" />
          </div>
          <div className="feed-news-card__content">
            <h3 className="feed-news-card__headline">{card.headline}</h3>
            <ArticleMeta
              variant="feed"
              category={card.categoryLabel}
              publishedAt={card.metaLabel}
            />
          </div>
        </Link>
      </div>
    </article>
  );
}
