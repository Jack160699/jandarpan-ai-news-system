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

export type BottomNavIcon = "home" | "video" | "live" | "profile";

export type BottomNavTab = {
  id: string;
  label: string;
  labelHi: string;
  href: string;
  icon: BottomNavIcon;
  /** Non-route actions — must be wired in BottomNav */
  action?: "menu";
};

/** Production bottom nav — Home, Videos, Live, Profile */
export const BOTTOM_NAV_TABS: BottomNavTab[] = [
  { id: "home", label: "Home", labelHi: "होम", href: "/", icon: "home" },
  {
    id: "videos",
    label: "Shorts",
    labelHi: "शॉर्ट्स",
    href: "/shorts",
    icon: "video",
  },
  {
    id: "live",
    label: "Live",
    labelHi: "लाइव",
    href: "/live",
    icon: "live",
  },
  {
    id: "profile",
    label: "Profile",
    labelHi: "प्रोफाइल",
    href: "/archive",
    icon: "profile",
  },
];

export const HEADER_LOCATION = {
  city: "Raipur",
  cityHi: "रायपुर",
  temp: "34°C",
  condition: "Haze",
} as const;
