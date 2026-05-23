/**
 * White-label tenant configuration — SaaS newsroom per client
 */

import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { TenantMonetizationSettings } from "@/lib/monetization/types";

export type TenantStatus = "active" | "suspended" | "trial";

export type TenantBranding = {
  nameEn: string;
  nameHi: string;
  taglineEn: string;
  taglineHi: string;
  logoUrl: string;
  logoMarkUrl?: string;
  faviconUrl?: string;
  conceptLabel?: string;
};

export type TenantTypography = {
  /** Google Font family for display/headlines */
  fontDisplay: string;
  fontBody: string;
  fontMeta: string;
  /** Optional regional script font */
  fontRegional?: string;
};

export type TenantTheme = {
  primary: string;
  primaryDark: string;
  accent: string;
  accentSoft: string;
  live: string;
  liveSoft: string;
  surface: string;
  ink: string;
};

export type TenantCategory = {
  id: string;
  slug: string;
  label: string;
  labelHi: string;
  /** Homepage section id for ranking */
  sectionId?: HomeSectionId;
  href: string;
  matchers: RegExp[];
  navOrder: number;
};

export type TenantRegion = {
  slug: string;
  name: string;
  nameHi: string;
  priority: 1 | 2 | 3;
  routingWeight: number;
  isPrimary?: boolean;
};

export type TenantNewsroomSettings = {
  defaultLanguage: NewsroomLanguage;
  enabledLanguages: NewsroomLanguage[];
  primaryRegionSlug: string;
  regionalFirst: boolean;
  regionalBoostMultiplier: number;
  timezone: string;
  headerCity: string;
  headerCityHi: string;
  editionLabel?: string;
};

export type TenantSeoSettings = {
  titleSuffix: string;
  defaultDescription: string;
  keywords: string[];
  locale: string;
};

export type TenantConfig = {
  version: 1;
  id: string;
  slug: string;
  status: TenantStatus;
  domains: string[];
  siteUrl: string;
  branding: TenantBranding;
  typography: TenantTypography;
  theme: TenantTheme;
  categories: TenantCategory[];
  regions: TenantRegion[];
  newsroom: TenantNewsroomSettings;
  seo: TenantSeoSettings;
  monetization?: TenantMonetizationSettings;
  updatedAt: string;
};

/** Public-safe subset for client SDK / edge */
export type TenantPublicConfig = {
  slug: string;
  branding: Pick<
    TenantBranding,
    "nameEn" | "nameHi" | "taglineEn" | "taglineHi" | "logoUrl" | "logoMarkUrl"
  >;
  theme: TenantTheme;
  typography: TenantTypography;
  categories: Array<Pick<TenantCategory, "id" | "slug" | "label" | "labelHi" | "href">>;
  regions: Array<Pick<TenantRegion, "slug" | "name" | "nameHi">>;
  newsroom: Pick<
    TenantNewsroomSettings,
    "defaultLanguage" | "enabledLanguages" | "primaryRegionSlug"
  >;
};
