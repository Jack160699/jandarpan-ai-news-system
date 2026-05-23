import type { PlacementSlotId, PlacementUnit, TenantMonetizationSettings } from "@/lib/monetization/types";

export const PLACEMENT_SLOT_META: Record<
  PlacementSlotId,
  { label: string; sizes: string; viewport: "mobile" | "desktop" | "all" }
> = {
  home_leaderboard: {
    label: "Home leaderboard",
    sizes: "728x90, 320x50",
    viewport: "all",
  },
  home_mid_feed: {
    label: "Home mid-feed",
    sizes: "300x250, 336x280",
    viewport: "all",
  },
  home_footer: {
    label: "Home footer",
    sizes: "728x90",
    viewport: "all",
  },
  story_sidebar: {
    label: "Story sidebar",
    sizes: "300x600, 300x250",
    viewport: "desktop",
  },
  story_in_article: {
    label: "In-article",
    sizes: "300x250",
    viewport: "all",
  },
  story_footer: {
    label: "Story footer",
    sizes: "728x90, 300x250",
    viewport: "all",
  },
  global_header: {
    label: "Global strip",
    sizes: "970x90",
    viewport: "all",
  },
  affiliate_rail: {
    label: "Affiliate rail",
    sizes: "native",
    viewport: "all",
  },
};

/** Default house ads for CG Bhaskar — lightweight promos */
export function defaultMonetizationSettings(): TenantMonetizationSettings {
  const house = (slotId: PlacementSlotId, label: string): PlacementUnit => ({
    slotId,
    type: "house",
    label,
    enabled: true,
    config: {
      alt: label,
      targetUrl: "/archive",
    },
  });

  return {
    enabled: true,
    adsEnabled: true,
    sponsoredStoriesEnabled: true,
    membershipsEnabled: true,
    newslettersEnabled: true,
    affiliatesEnabled: true,
    premiumReportsEnabled: true,
    labelAds: true,
    lazyLoad: true,
    placements: [
      house("home_leaderboard", "Support local journalism"),
      {
        slotId: "home_mid_feed",
        type: "display",
        label: "Regional partner",
        enabled: true,
        config: {
          alt: "Partner spotlight",
          targetUrl: "#",
        },
      },
      house("story_sidebar", "Subscribe — daily briefing"),
      {
        slotId: "story_in_article",
        type: "membership",
        enabled: true,
        config: {},
      },
      {
        slotId: "story_footer",
        type: "newsletter",
        enabled: true,
        config: {},
      },
      {
        slotId: "affiliate_rail",
        type: "affiliate",
        enabled: true,
        config: {},
      },
    ],
  };
}

export function getPlacementForSlot(
  settings: TenantMonetizationSettings,
  slotId: PlacementSlotId
): PlacementUnit | null {
  if (!settings.enabled) return null;
  return (
    settings.placements.find((p) => p.slotId === slotId && p.enabled) ?? null
  );
}
