"use client";

import type { ReactNode } from "react";
import {
  NATIVE_AD_INTERVAL,
  segmentFeedWithAds,
} from "@/lib/monetization/native-feed-ads";
import { NativeAdBlock } from "@/components/monetization/native/NativeAdBlock";

type FeedListWithNativeAdsProps<T> = {
  items: T[];
  feedId: string;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  interval?: number;
  /** Wrap each row — default `<li>` */
  itemWrapper?: "li" | "div" | "none";
  className?: string;
};

export function FeedListWithNativeAds<T>({
  items,
  feedId,
  getKey,
  renderItem,
  interval = NATIVE_AD_INTERVAL,
  itemWrapper = "li",
  className = "",
}: FeedListWithNativeAdsProps<T>) {
  const segments = segmentFeedWithAds(items, interval);

  const wrap = (key: string, node: ReactNode, isAd = false) => {
    if (itemWrapper === "none") {
      return (
        <div
          key={key}
          className={isAd ? "native-ad-feed-item" : "feed-grid__cell"}
        >
          {node}
        </div>
      );
    }
    if (itemWrapper === "div") {
      return (
        <div
          key={key}
          role="listitem"
          className={isAd ? "native-ad-feed-item" : undefined}
        >
          {node}
        </div>
      );
    }
    return (
      <li key={key} className={isAd ? "native-ad-feed-item" : undefined}>
        {node}
      </li>
    );
  };

  return (
    <>
      {segments.map((segment) => {
        if (segment.type === "content") {
          const key = getKey(segment.item, segment.contentIndex);
          return wrap(
            key,
            renderItem(segment.item, segment.contentIndex)
          );
        }
        return wrap(
          `ad-${feedId}-${segment.adIndex}`,
          <NativeAdBlock adIndex={segment.adIndex} feedId={feedId} />,
          true
        );
      })}
    </>
  );
}
