"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import type { NativeAdCreative } from "@/lib/monetization/native-feed-ads";
import { adLinkRel } from "@/lib/monetization/seo";
import { NativeAdShell } from "@/components/monetization/native/NativeAdShell";
import { trackMonetizationClick } from "@/components/monetization/useAdImpression";
import { useMonetizationOptional } from "@/providers/MonetizationProvider";

type RegionalSpotlightAdProps = {
  creative: NativeAdCreative;
  slotId: string;
};

export function RegionalSpotlightAd({
  creative,
  slotId,
}: RegionalSpotlightAdProps) {
  const monetization = useMonetizationOptional();

  return (
    <NativeAdShell
      slotId={slotId}
      size={creative.size}
      label="Sponsored"
      sublabel="Regional spotlight"
    >
      <a
        href={creative.targetUrl}
        className="native-ad__link native-ad__link--spotlight tap-target"
        rel={adLinkRel()}
        target="_blank"
        onClick={() =>
          monetization &&
          trackMonetizationClick(monetization.track, "click", {
            slotId,
            placementType: "display",
          })
        }
      >
        <div className="native-ad__spotlight-row">
          {creative.imageUrl ? (
            <div className="native-ad__media native-ad__media--spotlight">
              <Image
                src={creative.imageUrl}
                alt=""
                fill
                sizes="120px"
                className="native-ad__img"
                loading="lazy"
              />
            </div>
          ) : null}
          <div className="native-ad__copy">
            <p className="native-ad__sponsor">
              <MapPin
                className="native-ad__pin"
                strokeWidth={2}
                aria-hidden
              />
              {creative.sponsorName}
            </p>
            <h3 className="native-ad__headline">{creative.headline}</h3>
            {creative.description ? (
              <p className="native-ad__desc">{creative.description}</p>
            ) : null}
            <span className="native-ad__cta">{creative.ctaLabel}</span>
          </div>
        </div>
      </a>
    </NativeAdShell>
  );
}
