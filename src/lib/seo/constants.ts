import { BRAND } from "@/lib/brand";
import { JAN_DARPAN_BRAND_ASSETS } from "@/lib/brand/assets";
import { resolveCanonicalSiteUrl } from "@/lib/seo/canonical-url";

/** Production deploy — never emits preview *.vercel.app URLs in SEO output */
export const SITE_URL = resolveCanonicalSiteUrl();

export { CANONICAL_SITE_URL } from "@/lib/seo/canonical-url";

export const SITE_NAME = BRAND.nameEn;
export const SITE_NAME_HI = BRAND.nameHi;

/** Regional + brand keywords for layout defaults */
export const REGIONAL_KEYWORDS = [
  BRAND.nameEn,
  BRAND.nameHi,
  "Jan Darpan Chhattisgarh",
  "जन दर्पण छत्तीसगढ़",
  "Jan Darpan",
  "जन दर्पण",
  "Chhattisgarh news",
  "Raipur news",
  "Bastar news",
  "Bilaspur news",
  "Durg news",
  "CG news Hindi",
  "छत्तीसगढ़ समाचार",
  "regional news India",
  "live news Chhattisgarh",
  "Google News Chhattisgarh",
];

/** Default robots for public pages */
export const PRODUCTION_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
  },
} as const;

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
} as const;

/** Faceted / query search URLs — crawlable but not indexed */
export const NOINDEX_FOLLOW_ROBOTS = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
  },
} as const;

export const SEARCH_PAGE_CANONICAL = `${SITE_URL}/search`;

export const PUBLISHER_LOGO_URL = `${SITE_URL}${JAN_DARPAN_BRAND_ASSETS.mark}`;
