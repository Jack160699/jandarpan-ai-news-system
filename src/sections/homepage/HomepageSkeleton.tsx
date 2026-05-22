import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export function HomepageSkeleton() {
  return (
    <div className="hp" aria-busy="true" aria-label="Loading stories">
      <div className="hp__inner hp-hero py-12">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-6 h-10 max-w-2xl w-full" />
        <Skeleton className="mt-4 h-5 max-w-xl w-[85%]" />
        <Skeleton className="mt-8 aspect-[16/10] max-h-[280px] w-full md:max-w-[58%]" />
      </div>
      <div className="hp__inner py-8">
        <Skeleton className="h-4 w-32 mb-6" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex h-36 min-w-[16rem] flex-shrink-0 flex-col gap-3 rounded-[var(--ds-radius-md)] border border-[var(--rule)] p-4"
            >
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
