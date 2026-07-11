import Link from "next/link";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import type { StoryFeedCardModel } from "@/lib/news/story-feed-card";

export type StoryFeedCardVariant = "rail" | "grid" | "row";

type StoryFeedCardProps = {
  card: StoryFeedCardModel;
  variant?: StoryFeedCardVariant;
  imageSizes?: string;
  priority?: boolean;
};

/**
 * Server-safe related-story card — reuses feed-news-card / card-system markup.
 * No action row; presentation only.
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
            <HomeArticleImage
              src={card.imageUrl}
              alt=""
              sizes={imageSizes}
              priority={priority}
            />
            {card.isLive ? (
              <span className="feed-news-card__live" role="status">
                <span className="feed-news-card__live-dot" aria-hidden />
                LIVE
              </span>
            ) : null}
          </div>
          <div className="feed-news-card__content">
            <h3 className="feed-news-card__headline">{card.headline}</h3>
            <div className="feed-news-card__meta">
              <span className="feed-news-card__meta-category">
                {card.categoryLabel}
              </span>
              <span className="feed-news-card__meta-sep" aria-hidden>
                ·
              </span>
              <span>{card.metaLabel}</span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
