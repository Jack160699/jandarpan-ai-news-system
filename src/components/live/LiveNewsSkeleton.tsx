import { FeedCardSkeleton } from "@/components/ui/FeedCardSkeleton";

/** Homepage loading placeholder while Supabase feed resolves */
export function LiveNewsSkeleton() {
  return (
    <div className="live-news-skeleton" aria-hidden>
      <div className="feed-section feed-section--flush">
        <div className="feed-section__inner">
          <div className="skeleton skeleton-line skeleton-line--short mb-4 max-w-[8rem]" />
          <FeedCardSkeleton variant="hero" />
        </div>
      </div>
      <div className="feed-section">
        <div className="feed-section__inner">
          <div className="skeleton skeleton-line skeleton-line--short mb-4 max-w-[6rem]" />
          <FeedCardSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
