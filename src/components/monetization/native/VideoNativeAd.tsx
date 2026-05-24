"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { NativeAdCreative } from "@/lib/monetization/native-feed-ads";
import { adLinkRel } from "@/lib/monetization/seo";
import { NativeAdShell } from "@/components/monetization/native/NativeAdShell";
import { trackMonetizationClick } from "@/components/monetization/useAdImpression";
import { useMonetizationOptional } from "@/providers/MonetizationProvider";

type VideoNativeAdProps = {
  creative: NativeAdCreative;
  slotId: string;
};

export function VideoNativeAd({ creative, slotId }: VideoNativeAdProps) {
  const monetization = useMonetizationOptional();

  return (
    <NativeAdShell
      slotId={slotId}
      size={creative.size}
      label="Sponsored"
      sublabel="Video"
    >
      <a
        href={creative.targetUrl}
        className="native-ad__link native-ad__link--video tap-target"
        rel={adLinkRel()}
        onClick={() =>
          monetization &&
          trackMonetizationClick(monetization.track, "click", {
            slotId,
            placementType: "display",
          })
        }
      >
        <div className="native-ad__media native-ad__media--video">
          {creative.videoPosterUrl ? (
            <Image
              src={creative.videoPosterUrl}
              alt=""
              fill
              sizes="(max-width: 480px) 100vw, 640px"
              className="native-ad__img"
              loading="lazy"
            />
          ) : null}
          <span className="native-ad__play" aria-hidden>
            <Play strokeWidth={2} fill="currentColor" />
          </span>
        </div>
        <div className="native-ad__copy native-ad__copy--video">
          <p className="native-ad__sponsor">{creative.sponsorName}</p>
          <h3 className="native-ad__headline">{creative.headline}</h3>
          {creative.description ? (
            <p className="native-ad__desc">{creative.description}</p>
          ) : null}
        </div>
      </a>
    </NativeAdShell>
  );
}
