import { FEATURED_DISTRICT_SLUGS } from "@/lib/homepage/district-filter";
import { getFeaturedDistrict } from "@/lib/homepage/district-filter";
import type { LiveV3Scope } from "./types";

export const LIVE_V3_SCOPES: { id: LiveV3Scope; label: string; labelHi: string }[] = [
  { id: "all", label: "All updates", labelHi: "सभी अपडेट" },
  { id: "breaking", label: "Breaking", labelHi: "ब्रेकिंग" },
  { id: "developing", label: "Developing", labelHi: "विकसित" },
];

export const LIVE_V3_DISTRICT_OPTIONS = FEATURED_DISTRICT_SLUGS.map((slug) => {
  const district = getFeaturedDistrict(slug);
  return {
    slug,
    label: district.name,
    labelHi: district.nameHi,
  };
});

/** Auto-refresh hint shown in the live desk header */
export const LIVE_V3_REFRESH_HINT = "Auto-updates every 1–2 min";
