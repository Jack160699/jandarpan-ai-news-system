import {
  HyperlocalRailSkeleton,
  LiveWireListSkeleton,
  ShortsRailSkeleton,
  TrendingStoriesSkeleton,
} from "@/components/loading/HomepageLoadingView";

/** @deprecated use LiveWireListSkeleton */
export function LiveWireSkeleton() {
  return <LiveWireListSkeleton rows={5} />;
}

/** @deprecated use ShortsRailSkeleton */
export function TrendingShortsSkeleton() {
  return <ShortsRailSkeleton />;
}

export function HyperlocalSkeleton() {
  return <HyperlocalRailSkeleton />;
}

export function RegionalHighlightsSkeleton() {
  return <HyperlocalRailSkeleton />;
}

export function CategoryStreamsSkeleton() {
  return <TrendingStoriesSkeleton count={3} />;
}

export function QuickReadsSkeleton() {
  return <TrendingStoriesSkeleton count={4} />;
}

export function FooterIntelSkeleton() {
  return (
    <div className="pl-chips" aria-hidden>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="pl-shimmer-block pl-chips__item" />
      ))}
    </div>
  );
}
