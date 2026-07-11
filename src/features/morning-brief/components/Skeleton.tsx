import { Skeleton as JdsSkeleton } from "@/design-system/components/Skeleton";
import { BriefCard } from "./BriefCard";

export function GreetingSkeleton() {
  return (
    <div className="mb-greeting" aria-hidden>
      <JdsSkeleton variant="text" style={{ width: "30%", height: 14 }} />
      <JdsSkeleton variant="title" style={{ width: "70%" }} />
      <JdsSkeleton variant="text" style={{ width: "50%" }} />
    </div>
  );
}

export function BriefCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <BriefCard className="mb-skeleton-card" aria-hidden>
      <JdsSkeleton variant="title" style={{ width: "40%" }} />
      {Array.from({ length: lines }).map((_, i) => (
        <JdsSkeleton
          key={i}
          variant="text"
          style={{ width: i === lines - 1 ? "65%" : "100%" }}
        />
      ))}
    </BriefCard>
  );
}

export function MorningBriefSkeleton() {
  return (
    <div className="mb-skeleton" aria-busy="true" aria-label="Loading morning brief">
      <GreetingSkeleton />
      <BriefCardSkeleton lines={4} />
      <div className="mb-responsive mb-responsive--widgets">
        <BriefCardSkeleton lines={3} />
        <BriefCardSkeleton lines={3} />
      </div>
      <BriefCardSkeleton lines={2} />
      <BriefCardSkeleton lines={3} />
    </div>
  );
}
