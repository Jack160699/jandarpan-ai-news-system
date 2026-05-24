import type { Dictionary } from "@/lib/i18n/types";

export type MobileMenuItem = {
  id: string;
  href: string;
  labelKey: keyof Dictionary["nav"];
  tone?: "live" | "utility";
};

/** Full category + utility navigation — mobile menu drawer */
export const MOBILE_MENU_NAV: MobileMenuItem[] = [
  { id: "top-news", href: "/", labelKey: "topNews" },
  { id: "chhattisgarh", href: "/category/chhattisgarh", labelKey: "chhattisgarh" },
  { id: "raipur", href: "/category/raipur", labelKey: "raipur" },
  { id: "politics", href: "/category/politics", labelKey: "politics" },
  { id: "business", href: "/category/business", labelKey: "business" },
  { id: "sports", href: "/category/sports", labelKey: "sports" },
  { id: "education", href: "/category/education", labelKey: "education" },
  { id: "crime", href: "/category/crime", labelKey: "crime" },
  { id: "live", href: "/live", labelKey: "live", tone: "live" },
  { id: "search", href: "/search", labelKey: "search", tone: "utility" },
  { id: "saved", href: "/archive", labelKey: "saved", tone: "utility" },
];
