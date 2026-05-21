type FeedCardSkeletonProps = {
  count?: number;
  variant?: "horizontal" | "hero";
};

export function FeedCardSkeleton({
  count = 4,
  variant = "horizontal",
}: FeedCardSkeletonProps) {
  if (variant === "hero") {
    return (
      <div className="feed-skeleton-list" aria-hidden>
        <div className="skeleton skeleton-hero" />
        <div className="skeleton skeleton-line skeleton-line--short" />
        <div className="skeleton skeleton-line skeleton-line--title" />
        <div className="skeleton skeleton-line skeleton-line--title-2" />
      </div>
    );
  }

  return (
    <div className="feed-skeleton-list" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-card__thumb" />
          <div className="skeleton-card__body">
            <div className="skeleton skeleton-line skeleton-line--short" />
            <div className="skeleton skeleton-line skeleton-line--title" />
            <div className="skeleton skeleton-line skeleton-line--title-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
