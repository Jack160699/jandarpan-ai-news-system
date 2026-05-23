import { BRAND } from "@/lib/brand";

/** Production deploy — override via NEXT_PUBLIC_SITE_URL */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://newspaper-motion.vercel.app";

export const SITE_NAME = BRAND.nameEn;
export const SITE_NAME_HI = BRAND.nameHi;

/** Regional + brand keywords for layout defaults */
export const REGIONAL_KEYWORDS = [
  BRAND.nameEn,
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

export const PUBLISHER_LOGO_URL = `${SITE_URL}/brand/cg-bhaskar-mark.svg`;
