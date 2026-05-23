export type NavCategory = {
  id: string;
  label: string;
  labelHi?: string;
  href: string;
};

/** Fallback when tenant categories unavailable — real routes only */
export const NAV_CATEGORIES: NavCategory[] = [
  { id: "top-news", label: "Top News", labelHi: "टॉप", href: "/" },
  {
    id: "chhattisgarh",
    label: "Chhattisgarh",
    labelHi: "छत्तीसगढ़",
    href: "/category/chhattisgarh",
  },
  {
    id: "raipur",
    label: "Raipur",
    labelHi: "रायपुर",
    href: "/category/raipur",
  },
  {
    id: "politics",
    label: "Politics",
    labelHi: "राजनीति",
    href: "/category/politics",
  },
  {
    id: "business",
    label: "Business",
    labelHi: "व्यापार",
    href: "/category/business",
  },
  {
    id: "sports",
    label: "Sports",
    labelHi: "खेल",
    href: "/category/sports",
  },
  {
    id: "education",
    label: "Education",
    labelHi: "शिक्षा",
    href: "/category/education",
  },
];

export type BottomNavIcon =
  | "home"
  | "shorts"
  | "live"
  | "saved"
  | "search";

export type BottomNavTab = {
  id: string;
  label: string;
  labelHi: string;
  href: string;
  icon: BottomNavIcon;
  /** Non-route actions — must be wired in BottomNav */
  action?: "menu";
};

/** Production bottom nav — every item is a real route or menu */
export const BOTTOM_NAV_TABS: BottomNavTab[] = [
  { id: "home", label: "Home", labelHi: "होम", href: "/", icon: "home" },
  {
    id: "shorts",
    label: "Shorts",
    labelHi: "रील्स",
    href: "/shorts",
    icon: "shorts",
  },
  {
    id: "live",
    label: "Live",
    labelHi: "लाइव",
    href: "/live",
    icon: "live",
  },
  {
    id: "saved",
    label: "Saved",
    labelHi: "सेव्ड",
    href: "/archive",
    icon: "saved",
  },
  {
    id: "search",
    label: "Search",
    labelHi: "खोज",
    href: "/search",
    icon: "search",
  },
];

export const HEADER_LOCATION = {
  city: "Raipur",
  cityHi: "रायपुर",
  temp: "34°C",
  condition: "Haze",
} as const;
