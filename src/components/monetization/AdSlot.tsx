"use client";

import type { PlacementSlotId } from "@/lib/monetization/types";
import { PLACEMENT_SLOT_META } from "@/lib/monetization/placements";
import { NOSNIPPET_ATTRS, adLinkRel } from "@/lib/monetization/seo";
import { useMonetization } from "@/providers/MonetizationProvider";
import { useAdImpression, trackMonetizationClick } from "@/components/monetization/useAdImpression";
import { AffiliatePlacement } from "@/components/monetization/AffiliatePlacement";
import { NewsletterSignup } from "@/components/monetization/NewsletterSignup";
import { MembershipCTA } from "@/components/monetization/MembershipCTA";

type AdSlotProps = {
  slotId: PlacementSlotId;
  className?: string;
  articleSlug?: string;
};

export function AdSlot({ slotId, className = "", articleSlug }: AdSlotProps) {
  const { getSlot, settings, affiliatesForSlot, track } = useMonetization();
  const placement = getSlot(slotId);

  const ref = useAdImpression(
    slotId,
    placement?.type ?? "display",
    Boolean(placement?.enabled)
  );

  if (!settings.enabled || !placement) return null;

  const meta = PLACEMENT_SLOT_META[slotId];
  const sizeClass =
    slotId.includes("leaderboard") || slotId.includes("header")
      ? "mnr-unit--leaderboard"
      : slotId.includes("sidebar")
        ? "mnr-unit--sidebar"
        : "mnr-unit--rectangle";

  if (placement.type === "affiliate") {
    const units = affiliatesForSlot(slotId);
    if (!units.length) return null;
    return (
      <div
        className={`mnr-unit ${sizeClass} ${className}`.trim()}
        role="complementary"
        aria-label="Partner offers"
        {...NOSNIPPET_ATTRS}
      >
        {units.map((a) => (
          <AffiliatePlacement key={a.id} unit={a} slotId={slotId} />
        ))}
      </div>
    );
  }

  if (placement.type === "newsletter" && settings.newslettersEnabled) {
    return (
      <div className={className}>
        <NewsletterSignup slotId={slotId} />
      </div>
    );
  }

  if (placement.type === "membership" && settings.membershipsEnabled) {
    return (
      <div className={className}>
        <MembershipCTA compact={slotId === "story_in_article"} />
      </div>
    );
  }

  const { config } = placement;
  const label = settings.labelAds ? "Advertisement" : undefined;

  if (placement.type === "house") {
    return (
      <div
        ref={ref}
        className={`mnr-unit mnr-unit--house ${sizeClass} ${className}`.trim()}
        data-lazy={settings.lazyLoad ? "true" : "false"}
        role="complementary"
        {...NOSNIPPET_ATTRS}
      >
        {label ? <span className="mnr-label">{label}</span> : null}
        <a
          href={config.targetUrl ?? "/"}
          className="mnr-house mnr-link"
          rel={adLinkRel()}
          onClick={() =>
            trackMonetizationClick(track, "click", {
              slotId,
              placementType: "house",
              articleSlug,
            })
          }
        >
          {placement.label ?? config.alt ?? "Support our journalism"}
        </a>
      </div>
    );
  }

  if (config.gamSlotId) {
    return (
      <div
        ref={ref}
        className={`mnr-unit ${sizeClass} ${className}`.trim()}
        data-lazy={settings.lazyLoad ? "true" : "false"}
        role="complementary"
        aria-label={meta.label}
        data-gam-slot={config.gamSlotId}
        {...NOSNIPPET_ATTRS}
      >
        {label ? <span className="mnr-label">{label}</span> : null}
        <div
          className="mnr-gam"
          style={{ minHeight: config.height ?? 90 }}
          data-ad-slot={config.gamSlotId}
        />
      </div>
    );
  }

  if (config.imageUrl && config.targetUrl) {
    return (
      <div
        ref={ref}
        className={`mnr-unit ${sizeClass} ${className}`.trim()}
        data-lazy={settings.lazyLoad ? "true" : "false"}
        role="complementary"
        {...NOSNIPPET_ATTRS}
      >
        {label ? <span className="mnr-label">{label}</span> : null}
        <a
          href={config.targetUrl}
          className="mnr-link"
          rel={adLinkRel()}
          target="_blank"
          onClick={() =>
            trackMonetizationClick(track, "click", {
              slotId,
              placementType: "display",
              articleSlug,
            })
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.imageUrl}
            alt={config.alt ?? "Advertisement"}
            width={config.width ?? 300}
            height={config.height ?? 250}
            className="mnr-img"
            loading="lazy"
            decoding="async"
          />
        </a>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`mnr-unit ${sizeClass} ${className}`.trim()}
      data-lazy={settings.lazyLoad ? "true" : "false"}
      role="complementary"
      {...NOSNIPPET_ATTRS}
    >
      {label ? <span className="mnr-label">{label}</span> : null}
      <div className="mnr-house">
        {placement.label ?? meta.label} · {meta.sizes}
      </div>
    </div>
  );
}
