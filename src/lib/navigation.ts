export type NavCategory = {
  id: string;
  label: string;
  labelHi?: string;
  href: string;
};

/** Sticky category tabs — regional news app pattern */
export const NAV_CATEGORIES: NavCategory[] = [
  { id: "top-news", label: "Top News", labelHi: "टॉप", href: "#top-news" },
  { id: "chhattisgarh", label: "Chhattisgarh", labelHi: "छत्तीसगढ़", href: "#regional" },
  { id: "raipur", label: "Raipur", labelHi: "रायपुर", href: "#regional" },
  { id: "politics", label: "Politics", labelHi: "राजनीति", href: "#editorial" },
  { id: "crime", label: "Crime", labelHi: "अपराध", href: "#wire" },
  { id: "sports", label: "Sports", labelHi: "खेल", href: "#categories" },
  { id: "business", label: "Business", labelHi: "व्यापार", href: "#trending" },
  { id: "education", label: "Education", labelHi: "शिक्षा", href: "#categories" },
];

export type BottomNavTab = {
  id: string;
  label: string;
  labelHi: string;
  href: string;
  icon: "home" | "video" | "live" | "saved" | "profile";
};

export const BOTTOM_NAV_TABS: BottomNavTab[] = [
  { id: "home", label: "Home", labelHi: "होम", href: "/", icon: "home" },
  { id: "video", label: "Video", labelHi: "वीडियो", href: "/shorts", icon: "video" },
  { id: "live", label: "Live", labelHi: "लाइव", href: "/#breaking", icon: "live" },
  { id: "saved", label: "Saved", labelHi: "सेव", href: "/archive", icon: "saved" },
  { id: "profile", label: "Profile", labelHi: "प्रोफाइल", href: "/search", icon: "profile" },
];

export const HEADER_LOCATION = {
  city: "Raipur",
  cityHi: "रायपुर",
  temp: "34°C",
  condition: "Haze",
} as const;
