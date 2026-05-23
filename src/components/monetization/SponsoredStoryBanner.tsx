"use client";

import type { SponsoredStoryMeta } from "@/lib/monetization/types";
import { sponsoredLinkRel } from "@/lib/monetization/seo";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";
import { useLanguage } from "@/providers/LanguageProvider";

type SponsoredStoryBannerProps = {
  meta: SponsoredStoryMeta;
};

export function SponsoredStoryBanner({ meta }: SponsoredStoryBannerProps) {
  const { language } = useLanguage();
  const disclosure =
    language === "en"
      ? meta.disclosureEn
      : meta.disclosureHi ?? meta.disclosureEn;

  return (
    <aside
      className="mnr-sponsored"
      aria-label="Sponsored content disclosure"
      {...NOSNIPPET_ATTRS}
    >
      <span className="mnr-sponsored__badge">Sponsored</span>
      {meta.sponsorLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.sponsorLogoUrl}
          alt=""
          width={72}
          height={24}
          style={{ objectFit: "contain" }}
        />
      ) : null}
      <span>
        {disclosure} · <strong>{meta.sponsorName}</strong>
      </span>
      {meta.ctaUrl ? (
        <a
          href={meta.ctaUrl}
          rel={sponsoredLinkRel()}
          target="_blank"
          className="mnr-sponsored__cta"
        >
          {meta.ctaLabel ?? "Learn more"}
        </a>
      ) : null}
    </aside>
  );
}
