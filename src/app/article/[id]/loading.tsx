import { FeedCardSkeleton } from "@/components/ui/FeedCardSkeleton";

export default function LiveArticleLoading() {
  return (
    <div
      className="home-news-flow mobile-comfort relative z-[2] pt-4"
      aria-busy="true"
      aria-label="Loading article"
    >
      <div className="editorial-container">
        <div className="skeleton skeleton-line skeleton-line--short mb-6 max-w-[8rem]" />
        <div className="skeleton skeleton-hero mb-4" />
        <FeedCardSkeleton count={2} />
      </div>
    </div>
  );
}
