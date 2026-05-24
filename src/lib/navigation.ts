export type NavCategory = {
  id: string;
  label: string;
  labelHi?: string;
  href: string;
};

/** Production category rail — mobile-first premium nav */
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
    id: "bilaspur",
    label: "Bilaspur",
    labelHi: "बिलासपुर",
    href: "/category/bilaspur",
  },
  {
    id: "politics",
    label: "Politics",
    labelHi: "राजनीति",
    href: "/category/politics",
  },
  {
    id: "crime",
    label: "Crime",
    labelHi: "अपराध",
    href: "/category/crime",
  },
  {
    id: "sports",
    label: "Sports",
    labelHi: "खेल",
    href: "/category/sports",
  },
  {
    id: "business",
    label: "Business",
    labelHi: "व्यापार",
    href: "/category/business",
  },
  {
    id: "entertainment",
    label: "Entertainment",
    labelHi: "मनोरंजन",
    href: "/category/entertainment",
  },
  {
    id: "technology",
    label: "Technology",
    labelHi: "टेक",
    href: "/category/technology",
  },
  {
    id: "education",
    label: "Education",
    labelHi: "शिक्षा",
    href: "/category/education",
  },
  {
    id: "jobs",
    label: "Jobs",
    labelHi: "नौकरी",
    href: "/category/jobs",
  },
  {
    id: "videos",
    label: "Videos",
    labelHi: "वीडियो",
    href: "/shorts",
  },
  {
    id: "live",
    label: "LIVE",
    labelHi: "लाइव",
    href: "/live",
  },
];

export type BottomNavIcon = "home" | "listen" | "reels" | "live" | "menu";

export type BottomNavTab = {
  id: string;
  label: string;
  labelHi: string;
  href: string;
  icon: BottomNavIcon;
};

/** Mobile dock — Home · Listen · Reels · Live · Menu */
export const BOTTOM_NAV_TABS: BottomNavTab[] = [
  { id: "home", label: "Home", labelHi: "होम", href: "/", icon: "home" },
  {
    id: "listen",
    label: "Listen",
    labelHi: "सुनें",
    href: "/listen",
    icon: "listen",
  },
  {
    id: "reels",
    label: "Reels",
    labelHi: "रील्स",
    href: "/shorts",
    icon: "reels",
  },
  {
    id: "live",
    label: "Live",
    labelHi: "लाइव",
    href: "/live",
    icon: "live",
  },
  {
    id: "menu",
    label: "Menu",
    labelHi: "मेन्यू",
    href: "#menu",
    icon: "menu",
  },
];

export const HEADER_LOCATION = {
  city: "Raipur",
  cityHi: "रायपुर",
  temp: "34°C",
  condition: "Haze",
} as const;

/** Default trending topics for marquee strip */
export const DEFAULT_TRENDING_TOPICS = [
  "Election Results",
  "IPL 2026",
  "Petrol Prices",
  "Weather Alert",
  "CG Budget",
  "Raipur Metro",
] as const;
