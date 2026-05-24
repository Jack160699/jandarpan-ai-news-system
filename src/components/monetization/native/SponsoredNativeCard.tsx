"use client";

import Image from "next/image";
import type { NativeAdCreative } from "@/lib/monetization/native-feed-ads";
import { adLinkRel } from "@/lib/monetization/seo";
import { NativeAdShell } from "@/components/monetization/native/NativeAdShell";
import { trackMonetizationClick } from "@/components/monetization/useAdImpression";
import { useMonetizationOptional } from "@/providers/MonetizationProvider";

type SponsoredNativeCardProps = {
  creative: NativeAdCreative;
  slotId: string;
};

export function SponsoredNativeCard({
  creative,
  slotId,
}: SponsoredNativeCardProps) {
  const monetization = useMonetizationOptional();

  return (
    <NativeAdShell slotId={slotId} size={creative.size} label="Sponsored">
      <a
        href={creative.targetUrl}
        className="native-ad__link native-ad__link--card tap-target"
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
        {creative.imageUrl ? (
          <div className="native-ad__media native-ad__media--card">
            <Image
              src={creative.imageUrl}
              alt=""
              fill
              sizes="(max-width: 480px) 100vw, 336px"
              className="native-ad__img"
              loading="lazy"
            />
          </div>
        ) : null}
        <div className="native-ad__copy">
          <p className="native-ad__sponsor">{creative.sponsorName}</p>
          <h3 className="native-ad__headline">{creative.headline}</h3>
          {creative.description ? (
            <p className="native-ad__desc">{creative.description}</p>
          ) : null}
          <span className="native-ad__cta">{creative.ctaLabel}</span>
        </div>
      </a>
    </NativeAdShell>
  );
}
