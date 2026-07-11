import { Skeleton as JdsSkeleton } from "@/design-system/components/Skeleton";
import { DistrictCard } from "../components/DistrictCard";

export function DistrictHeroSkeleton() {
  return (
    <div className="dv3-hero" aria-hidden>
      <JdsSkeleton variant="text" style={{ width: "30%", height: 14 }} />
      <JdsSkeleton variant="title" style={{ width: "60%" }} />
      <JdsSkeleton variant="text" style={{ width: "45%" }} />
    </div>
  );
}

export function DistrictCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <DistrictCard className="dv3-skeleton-card" aria-hidden>
      <JdsSkeleton variant="title" style={{ width: "40%" }} />
      {Array.from({ length: lines }).map((_, i) => (
        <JdsSkeleton
          key={i}
          variant="text"
          style={{ width: i === lines - 1 ? "65%" : "100%" }}
        />
      ))}
    </DistrictCard>
  );
}

export function DistrictV3Skeleton() {
  return (
    <div className="dv3-skeleton" aria-busy="true" aria-label="Loading district page">
      <DistrictHeroSkeleton />
      <DistrictCardSkeleton lines={2} />
      <DistrictCardSkeleton lines={3} />
      <div className="dv3-responsive dv3-responsive--stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <DistrictCardSkeleton key={i} lines={2} />
        ))}
      </div>
      <div className="dv3-responsive dv3-responsive--widgets">
        <DistrictCardSkeleton lines={3} />
        <DistrictCardSkeleton lines={3} />
      </div>
      <DistrictCardSkeleton lines={4} />
      <div className="dv3-responsive dv3-responsive--split">
        <DistrictCardSkeleton lines={3} />
        <DistrictCardSkeleton lines={3} />
      </div>
      <DistrictCardSkeleton lines={3} />
    </div>
  );
}
