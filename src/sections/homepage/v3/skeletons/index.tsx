import { Skeleton } from "@/design-system/components/Skeleton";

export function GreetingSkeleton() {
  return (
    <div className="home-v3__section" aria-hidden>
      <Skeleton variant="title" className="home-v3-skeleton-block" style={{ width: "60%" }} />
      <Skeleton variant="text" className="home-v3-skeleton-block" style={{ width: "40%" }} />
    </div>
  );
}

export function BriefSkeleton() {
  return (
    <div className="home-v3-brief" aria-hidden>
      <Skeleton variant="title" style={{ width: "50%" }} />
      <Skeleton variant="text" />
      <Skeleton variant="text" style={{ width: "80%" }} />
      <div style={{ display: "flex", gap: "var(--jds-space-md)" }}>
        <Skeleton variant="text" style={{ width: 120, height: 44 }} />
        <Skeleton variant="text" style={{ width: 120, height: 44 }} />
      </div>
    </div>
  );
}

export function BreakingSkeleton() {
  return <Skeleton variant="media" className="home-v3-skeleton-block" style={{ minHeight: 320 }} />;
}

export function TopStoriesSkeleton() {
  return (
    <div className="home-v3-top-grid" aria-hidden>
      <Skeleton variant="media" className="home-v3-top-grid__hero" />
      <Skeleton variant="media" />
      <Skeleton variant="media" />
      <Skeleton variant="text" />
      <Skeleton variant="text" />
    </div>
  );
}

export function DistrictSkeleton() {
  return (
    <div className="home-v3-district" aria-hidden>
      <Skeleton variant="title" style={{ width: "40%" }} />
      <div className="home-v3-district__widgets">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="text" style={{ height: 72 }} />
        ))}
      </div>
      <Skeleton variant="media" />
    </div>
  );
}

export function LiveRailSkeleton() {
  return (
    <div className="home-v3-live-rail" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="text" style={{ minWidth: 280, height: 120 }} />
      ))}
    </div>
  );
}

export function SectionBlockSkeleton() {
  return (
    <div className="home-v3__section" aria-hidden>
      <Skeleton variant="title" style={{ width: "30%" }} />
      <Skeleton variant="media" />
    </div>
  );
}
