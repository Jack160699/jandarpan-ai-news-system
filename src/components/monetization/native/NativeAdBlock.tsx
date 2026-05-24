"use client";

import {
  getNativeAdCreative,
  nativeAdSlotId,
  type NativeAdKind,
} from "@/lib/monetization/native-feed-ads";
import { BannerCarouselAd } from "@/components/monetization/native/BannerCarouselAd";
import { RegionalSpotlightAd } from "@/components/monetization/native/RegionalSpotlightAd";
import { SponsoredNativeCard } from "@/components/monetization/native/SponsoredNativeCard";
import { VideoNativeAd } from "@/components/monetization/native/VideoNativeAd";
import { useMonetizationOptional } from "@/providers/MonetizationProvider";

type NativeAdBlockProps = {
  adIndex: number;
  feedId?: string;
  kind?: NativeAdKind;
  className?: string;
};

export function NativeAdBlock({
  adIndex,
  feedId = "home",
  kind,
  className = "",
}: NativeAdBlockProps) {
  const monetization = useMonetizationOptional();
  const settings = monetization?.settings;

  if (settings && (!settings.enabled || !settings.adsEnabled)) {
    return null;
  }

  const creative = getNativeAdCreative(adIndex);
  const resolvedKind = kind ?? creative.kind;
  const slotId = nativeAdSlotId(feedId, adIndex);

  const block = (() => {
    switch (resolvedKind) {
      case "regional":
        return (
          <RegionalSpotlightAd creative={creative} slotId={slotId} />
        );
      case "video":
        return <VideoNativeAd creative={creative} slotId={slotId} />;
      case "carousel":
        return <BannerCarouselAd creative={creative} slotId={slotId} />;
      case "sponsored":
      default:
        return <SponsoredNativeCard creative={creative} slotId={slotId} />;
    }
  })();

  return (
    <div className={className || undefined} data-ad-index={adIndex}>
      {block}
    </div>
  );
}
