"use client";

import Image from "next/image";
import { useRef } from "react";
import type { NativeAdCreative } from "@/lib/monetization/native-feed-ads";
import { adLinkRel } from "@/lib/monetization/seo";
import { NativeAdShell } from "@/components/monetization/native/NativeAdShell";
import { trackMonetizationClick } from "@/components/monetization/useAdImpression";
import { useMonetizationOptional } from "@/providers/MonetizationProvider";

type BannerCarouselAdProps = {
  creative: NativeAdCreative;
  slotId: string;
};

export function BannerCarouselAd({
  creative,
  slotId,
}: BannerCarouselAdProps) {
  const monetization = useMonetizationOptional();
  const scrollRef = useRef<HTMLDivElement>(null);
  const slides = creative.slides ?? [];

  return (
    <NativeAdShell
      slotId={slotId}
      size="full-width"
      label="Sponsored"
      sublabel="Partner highlights"
    >
      <div className="native-ad__carousel-wrap">
        <div
          ref={scrollRef}
          className="native-ad__carousel"
          role="list"
          aria-label={creative.headline}
        >
          {slides.map((slide) => (
            <a
              key={slide.id}
              href={slide.targetUrl}
              className="native-ad__carousel-slide tap-target"
              role="listitem"
              rel={adLinkRel()}
              onClick={() =>
                monetization &&
                trackMonetizationClick(monetization.track, "click", {
                  slotId,
                  placementType: "display",
                })
              }
            >
              {slide.imageUrl ? (
                <div className="native-ad__carousel-media">
                  <Image
                    src={slide.imageUrl}
                    alt=""
                    fill
                    sizes="240px"
                    className="native-ad__img"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <div className="native-ad__carousel-copy">
                {slide.subtitle ? (
                  <span className="native-ad__carousel-tag">{slide.subtitle}</span>
                ) : null}
                <span className="native-ad__carousel-title">{slide.title}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </NativeAdShell>
  );
}
