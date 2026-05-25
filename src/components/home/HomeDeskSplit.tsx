"use client";

import { useMemo } from "react";
import { DistrictHighlights } from "@/components/home/DistrictHighlights";
import { buildDistrictArticlePool } from "@/lib/homepage/district-filter";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { NationalHighlights } from "@/components/home/NationalHighlights";

type HomeDeskSplitProps = {
  feed: GeneratedHomepageFeed;
  liveWireItems?: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

/** District Wire + Global Brief — always visible on homepage */
export function HomeDeskSplit({
  feed,
  liveWireItems,
  freshIds,
}: HomeDeskSplitProps) {
  const wireItems = liveWireItems ?? feed.liveWire ?? [];
  const districtPool = useMemo(() => buildDistrictArticlePool(feed), [feed]);

  return (
    <div className="home-highlights-desk" id="highlights-desk">
      <div className="home-highlights-desk__block home-highlights-desk__block--districts">
        <DistrictHighlights articles={districtPool} freshIds={freshIds} />
      </div>
      <div className="home-highlights-desk__block home-highlights-desk__block--national">
        <NationalHighlights
          articles={wireItems}
          feed={feed}
          freshIds={freshIds}
          embedded
        />
      </div>
    </div>
  );
}
