/**
 * Monetization types — ads, sponsorships, memberships, newsletters, affiliates
 */

export type PlacementSlotId =
  | "home_leaderboard"
  | "home_mid_feed"
  | "home_footer"
  | "story_sidebar"
  | "story_in_article"
  | "story_footer"
  | "global_header"
  | "affiliate_rail";

export type PlacementType =
  | "display"
  | "html"
  | "house"
  | "affiliate"
  | "newsletter"
  | "membership";

export type DisplayAdConfig = {
  imageUrl?: string;
  targetUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Google Ad Manager / AdSense slot id */
  gamSlotId?: string;
  /** Raw HTML only when explicitly enabled server-side */
  htmlSnippet?: string;
};

export type PlacementUnit = {
  slotId: PlacementSlotId;
  type: PlacementType;
  label?: string;
  enabled: boolean;
  config: DisplayAdConfig & Record<string, unknown>;
};

export type TenantMonetizationSettings = {
  enabled: boolean;
  adsEnabled: boolean;
  sponsoredStoriesEnabled: boolean;
  membershipsEnabled: boolean;
  newslettersEnabled: boolean;
  affiliatesEnabled: boolean;
  premiumReportsEnabled: boolean;
  /** Show "Ad" disclosure on display units */
  labelAds: boolean;
  /** Lazy-load below-fold units */
  lazyLoad: boolean;
  placements: PlacementUnit[];
};

export type SponsoredStoryMeta = {
  sponsorName: string;
  sponsorLogoUrl?: string | null;
  disclosureEn: string;
  disclosureHi?: string | null;
  ctaUrl?: string | null;
  ctaLabel?: string | null;
};

export type ReaderPlan = {
  id: string;
  slug: string;
  nameEn: string;
  nameHi?: string | null;
  priceInr: number;
  billingInterval: "month" | "year" | "one_time";
  features: string[];
};

export type NewsletterOffer = {
  id: string;
  slug: string;
  nameEn: string;
  nameHi?: string | null;
  frequency: string;
  description?: string | null;
};

export type AffiliateUnit = {
  id: string;
  slotId: string;
  partnerName: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  targetUrl: string;
  disclosureEn: string;
  disclosureHi: string;
};

export type PremiumReportTeaser = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  heroImageUrl?: string | null;
  priceInr: number;
  isPaywalled: boolean;
};

export type MonetizationPayload = {
  tenantSlug: string;
  settings: TenantMonetizationSettings;
  plans: ReaderPlan[];
  newsletters: NewsletterOffer[];
  affiliates: AffiliateUnit[];
  premiumReports: PremiumReportTeaser[];
};

export type MonetizationEventType =
  | "impression"
  | "click"
  | "newsletter_signup"
  | "membership_view"
  | "premium_teaser_click"
  | "affiliate_click";
