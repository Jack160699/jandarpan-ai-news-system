"use client";

import type { AffiliateUnit } from "@/lib/monetization/types";
import { affiliateLinkRel, NOSNIPPET_ATTRS } from "@/lib/monetization/seo";
import { useLanguage } from "@/providers/LanguageProvider";
import { useMonetization } from "@/providers/MonetizationProvider";
import { trackMonetizationClick } from "@/components/monetization/useAdImpression";

type AffiliatePlacementProps = {
  unit: AffiliateUnit;
  slotId: string;
};

export function AffiliatePlacement({ unit, slotId }: AffiliatePlacementProps) {
  const { language } = useLanguage();
  const { track } = useMonetization();
  const disclosure =
    language === "en" ? unit.disclosureEn : unit.disclosureHi;

  return (
    <div className="mnr-affiliate" {...NOSNIPPET_ATTRS}>
      <span className="mnr-label">{disclosure}</span>
      <a
        href={unit.targetUrl}
        rel={affiliateLinkRel()}
        target="_blank"
        className="mnr-link"
        onClick={() =>
          trackMonetizationClick(track, "affiliate_click", {
            slotId,
            placementType: "affiliate",
          })
        }
      >
        {unit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={unit.imageUrl}
            alt=""
            className="mnr-img"
            loading="lazy"
          />
        ) : null}
        <span className="mnr-affiliate__title">{unit.title}</span>
        {unit.description ? (
          <span className="anr-meta">{unit.description}</span>
        ) : null}
        <span className="anr-meta">{unit.partnerName}</span>
      </a>
    </div>
  );
}
