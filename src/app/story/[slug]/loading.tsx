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
        <Skeleton className="immersive-story__hero mt-8 aspect-[16/10] w-full" />
        <Skeleton className="immersive-summary mt-10 h-28 w-full" />
        <div className="mt-10">
          <SkeletonText lines={4} />
        </div>
      </div>
    </div>
  );
}
