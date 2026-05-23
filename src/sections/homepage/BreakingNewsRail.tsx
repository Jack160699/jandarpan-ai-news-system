import Link from "next/link";
import { LiveWireFeed } from "@/components/live-desk/LiveWireFeed";
import type { HomeArticle } from "@/lib/homepage/types";

type BreakingNewsRailProps = {
  items: HomeArticle[];
};

export function BreakingNewsRail({ items }: BreakingNewsRailProps) {
  if (!items.length) return null;

  const featured = items.slice(0, 12);

  return (
    <section
      id="breaking-rail"
      className="breaking-rail scroll-mt-24"
      aria-labelledby="breaking-rail-title"
    >
      <div className="nr-wrap breaking-rail__head">
        <div>
          <p className="breaking-rail__kicker">
            <span className="breaking-rail__pulse-dot" aria-hidden />
            Breaking now
          </p>
          <h2 id="breaking-rail-title" className="breaking-rail__title">
            ताज़ा खबर
          </h2>
        </div>
        <Link href="/live" className="breaking-rail__cta tap-target">
          Live desk →
        </Link>
      </div>

      <LiveWireFeed items={featured} variant="rail" />
    </section>
  );
}
