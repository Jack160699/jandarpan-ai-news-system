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
      <div className="feed-skeleton-list pl-stagger" aria-hidden>
        <div className="pl-shimmer-block skeleton-hero" />
        <div className="pl-shimmer-block skeleton-line skeleton-line--short" />
        <div className="pl-shimmer-block skeleton-line skeleton-line--title" />
        <div className="pl-shimmer-block skeleton-line skeleton-line--title-2" />
      </div>
    );
  }

  return (
    <div className="feed-skeleton-list pl-stagger" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card pl-stagger-item">
          <div className="pl-shimmer-block skeleton-card__thumb" />
          <div className="skeleton-card__body">
            <div className="pl-shimmer-block skeleton-line skeleton-line--short" />
            <div className="pl-shimmer-block skeleton-line skeleton-line--title" />
            <div className="pl-shimmer-block skeleton-line skeleton-line--title-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
