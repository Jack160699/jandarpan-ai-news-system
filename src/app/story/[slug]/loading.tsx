import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function StoryLoading() {
  return (
    <div
      className="immersive-story"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading article"
    >
      <div className="immersive-story__shell">
        <div className="immersive-chrome" style={{ minHeight: "3.25rem" }} />
        <div className="immersive-story__header pt-10">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-10 max-w-xl w-full" />
          <Skeleton className="mt-3 h-5 max-w-md w-[70%]" />
        </div>
        <div className="story-cat-nav mt-4 flex gap-2 overflow-hidden">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <Skeleton className="immersive-story__hero mt-6 aspect-[16/9] w-full max-w-none" />
        <Skeleton className="immersive-summary mt-10 h-28 w-full" />
        <Skeleton className="story-highlights mt-8 h-24 w-full" />
        <div className="mt-10">
          <SkeletonText lines={4} />
        </div>
      </div>
    </div>
  );
}
