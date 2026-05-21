import { FeedCardSkeleton } from "@/components/ui/FeedCardSkeleton";

export default function StoryLoading() {
  return (
    <div
      className="home-news-flow mobile-comfort relative z-[2] pt-4"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading article"
    >
      <div className="editorial-container">
        <div className="skeleton skeleton-line skeleton-line--short mb-6" />
        <div className="skeleton skeleton-hero mb-4" />
        <div className="skeleton skeleton-line skeleton-line--title mb-2" />
        <div className="skeleton skeleton-line skeleton-line--title-2 mb-6" />
        <FeedCardSkeleton count={3} />
      </div>
    </div>
  );
}
