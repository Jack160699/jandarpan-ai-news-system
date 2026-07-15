"use client";

import type { PlacementSlotId } from "@/lib/monetization/types";
import { PLACEMENT_SLOT_META } from "@/lib/monetization/placements";
import { NOSNIPPET_ATTRS, adLinkRel } from "@/lib/monetization/seo";
import { isMonetizationV3Enabled } from "@/features/monetization-v3/config";
import {
  AdContainer,
  slotToAdVariant,
  PremiumBanner,
  NewsletterSignup as NewsletterSignupV3,
} from "@/features/monetization-v3";
import "@/features/monetization-v3/styles/monetization-v3.css";
import { useMonetization } from "@/providers/MonetizationProvider";
import { useAdImpression, trackMonetizationClick } from "@/components/monetization/useAdImpression";
import { AffiliatePlacement } from "@/components/monetization/AffiliatePlacement";
import { NewsletterSignup } from "@/components/monetization/NewsletterSignup";
import { MembershipCTA } from "@/components/monetization/MembershipCTA";

type AdSlotProps = {
  slotId: PlacementSlotId;
  className?: string;
  articleSlug?: string;
  format?: "mobile-banner" | "rectangle" | "large-rectangle" | "leaderboard" | "sidebar";
  responsiveSizes?: string;
  minReservedHeight?: number;
  collapseIfEmpty?: boolean;
};

export function AdSlot({
  slotId,
  className = "",
  articleSlug,
  format,
  responsiveSizes,
  minReservedHeight,
  collapseIfEmpty = true,
}: AdSlotProps) {
  const { getSlot, settings, affiliatesForSlot, track } = useMonetization();
  const placement = getSlot(slotId);
  const monetizationV3 = isMonetizationV3Enabled();

  const ref = useAdImpression(
    slotId,
    placement?.type ?? "display",
    Boolean(placement?.enabled && !monetizationV3)
  );

  if (!settings.enabled || !settings.adsEnabled || !placement) {
    if (collapseIfEmpty) return null;
    return (
      <div
        className={`mnr-unit mnr-unit--empty ${className}`.trim()}
        data-ad-slot={slotId}
        data-ad-empty="true"
        style={minReservedHeight ? { minHeight: minReservedHeight } : undefined}
        aria-hidden
      />
    );
  }

  const meta = PLACEMENT_SLOT_META[slotId];
  const sizeClass =
    format === "mobile-banner" || format === "leaderboard" ||
    slotId.includes("leaderboard") || slotId.includes("header")
      ? "mnr-unit--leaderboard"
      : format === "sidebar" || slotId.includes("sidebar")
        ? "mnr-unit--sidebar"
        : format === "large-rectangle"
          ? "mnr-unit--large-rectangle"
          : "mnr-unit--rectangle";

  if (placement.type === "affiliate") {
    const units = affiliatesForSlot(slotId);
    if (!units.length) return null;

    if (monetizationV3) {
      return (
        <AdContainer
          variant={slotToAdVariant(slotId)}
          slotId={slotId}
          showLabel={settings.labelAds}
          label="Partner offers"
          lazy={settings.lazyLoad}
          responsiveSizes={responsiveSizes}
          minReservedHeight={minReservedHeight}
          className={className}
        >
          {units.map((a) => (
            <AffiliatePlacement key={a.id} unit={a} slotId={slotId} />
          ))}
        </AdContainer>
      );
    }

    return (
      <div
        className={`mnr-unit ${sizeClass} ${className}`.trim()}
        data-ad-slot={slotId}
        data-responsive-sizes={responsiveSizes}
        style={minReservedHeight ? { minHeight: minReservedHeight } : undefined}
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
        {monetizationV3 ? (
          <NewsletterSignupV3 slotId={slotId} />
        ) : (
          <NewsletterSignup slotId={slotId} />
        )}
      </div>
    );
  }

  if (placement.type === "membership" && settings.membershipsEnabled) {
    return (
      <div className={className}>
        {monetizationV3 ? (
          <PremiumBanner
            variant={slotId === "story_in_article" ? "compact" : "inline"}
            onCtaClick={() =>
              track("membership_view", { slotId: "story_in_article" })
            }
          />
        ) : (
          <MembershipCTA compact={slotId === "story_in_article"} />
        )}
      </div>
    );
  }

  const { config } = placement;
  const label = settings.labelAds ? "Advertisement" : undefined;

  if (monetizationV3) {
    const variant = slotToAdVariant(slotId);

    if (placement.type === "house") {
      return (
        <AdContainer
          variant={variant}
          slotId={slotId}
          showLabel
          label="Jan Darpan"
          lazy={settings.lazyLoad}
          responsiveSizes={responsiveSizes}
          minReservedHeight={minReservedHeight}
          className={className}
        >
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
        </AdContainer>
      );
    }

    if (config.gamSlotId) {
      return (
        <AdContainer
          variant={variant}
          slotId={slotId}
          showLabel={Boolean(label)}
          label={label}
          lazy={settings.lazyLoad}
          responsiveSizes={responsiveSizes}
          minReservedHeight={minReservedHeight}
          className={className}
        >
          <div
            className="mnr-gam"
            style={{ minHeight: config.height ?? 90 }}
            data-ad-slot={config.gamSlotId}
            data-gam-slot={config.gamSlotId}
          />
        </AdContainer>
      );
    }

    if (config.imageUrl && config.targetUrl) {
      return (
        <AdContainer
          variant={variant}
          slotId={slotId}
          showLabel={Boolean(label)}
          label={label}
          lazy={settings.lazyLoad}
          responsiveSizes={responsiveSizes}
          minReservedHeight={minReservedHeight}
          className={className}
        >
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
        </AdContainer>
      );
    }

    return null;
  }

  if (placement.type === "house") {
    return (
      <div
        ref={ref}
        className={`mnr-unit mnr-unit--house ${sizeClass} ${className}`.trim()}
        data-ad-slot={slotId}
        data-placement-type="house"
        data-responsive-sizes={responsiveSizes}
        style={minReservedHeight ? { minHeight: minReservedHeight } : undefined}
        data-lazy={settings.lazyLoad ? "true" : "false"}
        role="complementary"
        {...NOSNIPPET_ATTRS}
      >
        <span className="mnr-label">Jan Darpan</span>
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
        data-responsive-sizes={responsiveSizes}
        style={minReservedHeight ? { minHeight: minReservedHeight } : undefined}
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
        data-ad-slot={slotId}
        data-responsive-sizes={responsiveSizes}
        style={minReservedHeight ? { minHeight: minReservedHeight } : undefined}
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

  return null;
}
