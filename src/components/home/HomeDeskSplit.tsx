"use client";

import { useMemo } from "react";
import { DistrictHighlights } from "@/components/home/DistrictHighlights";
import { buildDistrictArticlePool } from "@/lib/homepage/district-filter";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { LiveWire } from "@/sections/homepage/LiveWire";

type HomeDeskSplitProps = {
  feed: GeneratedHomepageFeed;
  liveWireItems?: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

/** District highlights first, national highlights second — single editorial column */
export function HomeDeskSplit({
  feed,
  liveWireItems,
  freshIds,
}: HomeDeskSplitProps) {
  const wireItems = liveWireItems ?? feed.liveWire;
  const districtPool = useMemo(() => buildDistrictArticlePool(feed), [feed]);

  if (!wireItems.length && !districtPool.length) return null;

  return (
    <div className="home-highlights-desk" id="highlights-desk">
      {districtPool.length > 0 ? (
        <div className="home-highlights-desk__block home-highlights-desk__block--districts">
          <DistrictHighlights articles={districtPool} freshIds={freshIds} />
        </div>
      ) : null}
      {wireItems.length > 0 ? (
        <div className="home-highlights-desk__block home-highlights-desk__block--national">
          <LiveWire items={wireItems} freshIds={freshIds} embedded />
        </div>
      ) : null}
    </div>
  );
}
