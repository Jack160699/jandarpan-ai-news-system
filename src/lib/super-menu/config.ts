import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { PolicySlug } from "@/lib/legal/policies";

export type SuperMenuLink = {
  id: string;
  href: string;
  labelEn: string;
  labelHi: string;
  icon?: string;
  tone?: "live" | "accent" | "utility";
};

export type FeedInterest = {
  id: string;
  labelEn: string;
  labelHi: string;
};

export const FEED_INTERESTS: FeedInterest[] = [
  { id: "politics", labelEn: "Politics", labelHi: "राजनीति" },
  { id: "cricket", labelEn: "Cricket", labelHi: "क्रिकेट" },
  { id: "business", labelEn: "Business", labelHi: "व्यापार" },
  { id: "cg-news", labelEn: "CG News", labelHi: "छत्तीसगढ़" },
  { id: "raipur", labelEn: "Raipur", labelHi: "रायपुर" },
  { id: "education", labelEn: "Education", labelHi: "शिक्षा" },
  { id: "stocks", labelEn: "Stocks", labelHi: "शेयर बाजार" },
  { id: "gold", labelEn: "Gold Rates", labelHi: "सोना" },
  { id: "jobs", labelEn: "Jobs", labelHi: "नौकरी" },
  { id: "technology", labelEn: "Technology", labelHi: "टेक" },
  { id: "entertainment", labelEn: "Entertainment", labelHi: "मनोरंजन" },
  { id: "farming", labelEn: "Farming", labelHi: "कृषि" },
  { id: "weather", labelEn: "Weather", labelHi: "मौसम" },
  { id: "live-tv", labelEn: "Live TV", labelHi: "लाइव टीवी" },
];

export const MENU_CATEGORIES: SuperMenuLink[] = [
  { id: "top", href: "/", labelEn: "Top News", labelHi: "टॉप", icon: "◆" },
  { id: "cg", href: "/category/chhattisgarh", labelEn: "CG News", labelHi: "छत्तीसगढ़" },
  { id: "raipur", href: "/category/raipur", labelEn: "Raipur", labelHi: "रायपुर" },
  { id: "politics", href: "/category/politics", labelEn: "Politics", labelHi: "राजनीति" },
  { id: "business", href: "/category/business", labelEn: "Business", labelHi: "व्यापार" },
  { id: "sports", href: "/category/sports", labelEn: "Sports", labelHi: "खेल" },
  { id: "education", href: "/category/education", labelEn: "Education", labelHi: "शिक्षा" },
  { id: "crime", href: "/category/crime", labelEn: "Crime", labelHi: "अपराध" },
  { id: "technology", href: "/category/technology", labelEn: "Technology", labelHi: "टेक" },
  { id: "agriculture", href: "/category/agriculture", labelEn: "Agriculture", labelHi: "कृषि" },
  { id: "entertainment", href: "/category/entertainment", labelEn: "Entertainment", labelHi: "मनोरंजन" },
  { id: "world", href: "/category/world", labelEn: "World", labelHi: "विश्व" },
];

export const MENU_DISTRICTS: SuperMenuLink[] = [
  { id: "raipur", href: "/district/raipur", labelEn: "Raipur", labelHi: "रायपुर" },
  { id: "bilaspur", href: "/district/bilaspur", labelEn: "Bilaspur", labelHi: "बिलासपुर" },
  { id: "durg", href: "/district/durg", labelEn: "Durg", labelHi: "दुर्ग" },
  { id: "bastar", href: "/district/bastar", labelEn: "Bastar", labelHi: "बस्तर" },
  { id: "korba", href: "/district/korba", labelEn: "Korba", labelHi: "कोरबा" },
  { id: "rajnandgaon", href: "/district/rajnandgaon", labelEn: "Rajnandgaon", labelHi: "राजनांदगाँव" },
];

export const MENU_UTILITIES: SuperMenuLink[] = [
  { id: "weather", href: "/search?q=weather", labelEn: "Weather", labelHi: "मौसम", icon: "☁" },
  { id: "cricket", href: "/search?q=cricket", labelEn: "Live Cricket", labelHi: "क्रिकेट", icon: "🏏" },
  { id: "emi", href: "/search?q=emi+calculator", labelEn: "EMI Calculator", labelHi: "EMI कैलकुलेटर", icon: "₹" },
  { id: "fuel", href: "/search?q=fuel+price+chhattisgarh", labelEn: "Fuel Prices", labelHi: "ईंधन दर", icon: "⛽" },
  { id: "election", href: "/search?q=election", labelEn: "Election Tracker", labelHi: "चुनाव", icon: "🗳" },
  { id: "breaking", href: "/live", labelEn: "Breaking News", labelHi: "ब्रेकिंग", icon: "⚡", tone: "live" },
  { id: "live-tv", href: "/search?q=live+tv", labelEn: "Live TV", labelHi: "लाइव टीवी", icon: "📺" },
  { id: "horoscope", href: "/search?q=horoscope", labelEn: "Horoscope", labelHi: "राशिफल", icon: "✦" },
  { id: "epaper", href: "/search?q=epaper", labelEn: "EPaper", labelHi: "ई-पेपर", icon: "📰" },
];

export const MENU_ACCOUNT_LINKS: SuperMenuLink[] = [
  { id: "saved", href: "/archive", labelEn: "Saved Stories", labelHi: "सेव की खबरें" },
  { id: "listen", href: "/listen", labelEn: "Listen", labelHi: "सुनें" },
  { id: "shorts", href: "/shorts", labelEn: "Reels", labelHi: "रील्स" },
  { id: "search", href: "/search", labelEn: "Search", labelHi: "खोजें" },
  { id: "profile", href: "/archive", labelEn: "Settings", labelHi: "सेटिंग्स" },
];

export type LegalMenuItem = {
  id: string;
  slug: PolicySlug | "community-guidelines" | "safety" | "fact-check-policy";
  path: string;
  labelEn: string;
  labelHi: string;
};

export const MENU_LEGAL_LINKS: LegalMenuItem[] = [
  { id: "terms", slug: "terms", path: "/terms", labelEn: "Terms & Conditions", labelHi: "नियम और शर्तें" },
  { id: "privacy", slug: "privacy", path: "/privacy", labelEn: "Privacy Policy", labelHi: "गोपनीयता" },
  { id: "cookies", slug: "cookies", path: "/cookies", labelEn: "Cookie Policy", labelHi: "कुकी नीति" },
  { id: "ads", slug: "ads-policy", path: "/ads-policy", labelEn: "Ads & Personalization", labelHi: "विज्ञापन नीति" },
  { id: "community", slug: "community-guidelines", path: "/community-guidelines", labelEn: "Community Guidelines", labelHi: "समुदाय दिशानिर्देश" },
  { id: "safety", slug: "safety", path: "/safety", labelEn: "User Safety Standards", labelHi: "उपयोगकर्ता सुरक्षा" },
  { id: "fact-check", slug: "fact-check-policy", path: "/fact-check-policy", labelEn: "Fact Check Policy", labelHi: "फैक्ट चेक नीति" },
];

export function labelForLink(
  link: { labelEn: string; labelHi: string },
  language: NewsroomLanguage
): string {
  return pickBilingualLabel(language, link.labelEn, link.labelHi);
}
