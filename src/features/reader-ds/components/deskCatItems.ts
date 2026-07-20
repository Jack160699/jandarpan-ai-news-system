/**
 * Editorial category destinations for desktop/tablet CatNav (SoT).
 * Phone bottom nav stays separate (5 destinations).
 */

export type DeskCatKey =
  | "home"
  | "latest"
  | "cg"
  | "districts"
  | "india"
  | "world"
  | "politics"
  | "business"
  | "sports"
  | "entertainment"
  | "tech"
  | "lifestyle"
  | "opinion";

export type DeskCatItem = {
  key: DeskCatKey;
  href: string;
  labelHi: string;
  labelEn: string;
};

/** Full desktop set — SoT CatNav order */
export const DESK_CAT_ITEMS: DeskCatItem[] = [
  { key: "home", href: "/", labelHi: "होम", labelEn: "Home" },
  { key: "latest", href: "/latest", labelHi: "ताज़ा", labelEn: "Latest" },
  { key: "cg", href: "/category/chhattisgarh", labelHi: "छत्तीसगढ़", labelEn: "Chhattisgarh" },
  { key: "districts", href: "/district?select=1", labelHi: "ज़िले", labelEn: "Districts" },
  { key: "india", href: "/news/national", labelHi: "भारत", labelEn: "India" },
  { key: "world", href: "/news/international", labelHi: "विश्व", labelEn: "World" },
  { key: "politics", href: "/category/politics", labelHi: "राजनीति", labelEn: "Politics" },
  { key: "business", href: "/category/business", labelHi: "व्यापार", labelEn: "Business" },
  { key: "sports", href: "/category/sports", labelHi: "खेल", labelEn: "Sports" },
  { key: "entertainment", href: "/category/entertainment", labelHi: "मनोरंजन", labelEn: "Entertainment" },
  { key: "tech", href: "/category/technology", labelHi: "टेक्नोलॉजी", labelEn: "Technology" },
  { key: "lifestyle", href: "/category/lifestyle", labelHi: "जीवनशैली", labelEn: "Lifestyle" },
  { key: "opinion", href: "/category/opinion", labelHi: "ओपिनियन", labelEn: "Opinion" },
];

/** Tablet portrait truncated set (SoT H04) */
export const DESK_CAT_ITEMS_COMPACT: DeskCatKey[] = [
  "home",
  "latest",
  "cg",
  "india",
  "sports",
  "opinion",
];

export function resolveDeskCatActive(pathname: string): DeskCatKey {
  if (!pathname || pathname === "/") return "home";
  if (pathname.startsWith("/latest")) return "latest";
  if (pathname.startsWith("/trending")) return "latest";
  if (pathname.startsWith("/district")) return "districts";
  if (pathname.startsWith("/news/national")) return "india";
  if (pathname.startsWith("/news/international")) return "world";
  if (pathname.startsWith("/category/chhattisgarh")) return "cg";
  if (pathname.startsWith("/category/politics")) return "politics";
  if (pathname.startsWith("/category/business")) return "business";
  if (pathname.startsWith("/category/sports")) return "sports";
  if (pathname.startsWith("/category/entertainment")) return "entertainment";
  if (pathname.startsWith("/category/technology") || pathname.startsWith("/category/tech")) {
    return "tech";
  }
  if (pathname.startsWith("/category/lifestyle")) return "lifestyle";
  if (pathname.startsWith("/category/opinion")) return "opinion";
  if (pathname.startsWith("/live")) return "latest";
  return "home";
}
