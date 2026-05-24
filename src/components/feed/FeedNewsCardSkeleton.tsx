type FeedNewsCardSkeletonProps = {
  variant?: "standard" | "compact" | "lead";
};

export function FeedNewsCardSkeleton({
  variant = "standard",
}: FeedNewsCardSkeletonProps) {
  return (
    <article
      className={`feed-news-card feed-news-card--skeleton feed-news-card--${variant}`}
      aria-hidden
      aria-busy="true"
    >
      <div className="feed-news-card__main">
        <div className="feed-news-card__link">
          <div className="feed-news-card__media feed-news-card__shimmer" />
          <div className="feed-news-card__content">
            <div className="feed-news-card__shimmer feed-news-card__shimmer--title" />
            <div className="feed-news-card__shimmer feed-news-card__shimmer--title feed-news-card__shimmer--title-short" />
            {variant !== "compact" ? (
              <div className="feed-news-card__shimmer feed-news-card__shimmer--summary" />
            ) : null}
            <div className="feed-news-card__shimmer feed-news-card__shimmer--meta" />
          </div>
        </div>
        <div className="feed-news-card__actions feed-news-card__actions--skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="feed-news-card__shimmer feed-news-card__shimmer--action"
            />
          ))}
        </div>
      </div>
    </article>
  );
}
