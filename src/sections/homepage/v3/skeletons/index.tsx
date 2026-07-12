import { Skeleton } from "@/design-system/components/Skeleton";

export function LocalPulseSkeleton() {
  return (
    <div className="home-v31__section" aria-hidden>
      <Skeleton variant="text" className="home-v31-skeleton-block" style={{ width: "55%" }} />
      <div style={{ display: "flex", gap: "var(--jds-space-sm)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="text" style={{ width: 72, height: 36, borderRadius: 999 }} />
        ))}
      </div>
    </div>
  );
}

export function LeadSkeleton() {
  return <Skeleton variant="media" className="home-v31-skeleton-block" style={{ minHeight: 280 }} />;
}

export function QuickScanSkeleton() {
  return (
    <div style={{ display: "flex", gap: "var(--jds-space-md)" }} aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="text" style={{ minWidth: 260, height: 120, flexShrink: 0 }} />
      ))}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="home-v31-feed" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="media" style={{ minHeight: 100 }} />
      ))}
    </div>
  );
}

export function LiveRailSkeleton() {
  return (
    <div className="home-v31-live-rail" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="text" style={{ minWidth: 260, height: 110, flexShrink: 0 }} />
      ))}
    </div>
  );
}

export function SectionBlockSkeleton() {
  return (
    <div className="home-v31__section" aria-hidden>
      <Skeleton variant="title" style={{ width: "35%" }} />
      <Skeleton variant="media" />
    </div>
  );
}

/** @deprecated Use FeedSkeleton */
export const TopStoriesSkeleton = FeedSkeleton;

/** @deprecated Use SectionBlockSkeleton */
export const DistrictSkeleton = SectionBlockSkeleton;

/** @deprecated Use LeadSkeleton */
export const BreakingSkeleton = LeadSkeleton;

/** @deprecated Use LocalPulseSkeleton */
export const GreetingSkeleton = LocalPulseSkeleton;

/** @deprecated Use QuickScanSkeleton */
export const BriefSkeleton = QuickScanSkeleton;
