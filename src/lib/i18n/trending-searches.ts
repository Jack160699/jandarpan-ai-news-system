import type { NewsroomLanguage } from "@/lib/i18n/languages";

const BY_LANG: Record<NewsroomLanguage, string[]> = {
  en: [
    "Raipur news today",
    "Chhattisgarh politics",
    "CG budget 2026",
    "Bilaspur updates",
    "Bastar security",
    "Durg industry news",
  ],
  hi: [
    "रायपुर समाचार आज",
    "छत्तीसगढ़ राजनीति",
    "छत्तीसगढ़ बजट",
    "बिलासपुर खबर",
    "बस्तर अपडेट",
    "दुर्ग भिलाई समाचार",
  ],
  cg: [
    "रायपुर खबर आज",
    "छत्तीसगढ़ राजनीति",
    "छत्तीसगढ़ बजट",
    "बिलासपुर अपडेट",
    "बस्तर खबर",
    "दुर्ग समाचार",
  ],
  mr: [
    "रायपूर बातम्या",
    "छत्तीसगढ राजकारण",
    "छत्तीसगढ बजेट",
    "बिलासपूर बातम्या",
    "बस्तर अपडेट",
  ],
  bn: [
    "রায়পুর খবর",
    "ছত্তীসগড় রাজনীতি",
    "ছত্তীসগড় বাজেট",
    "বিলাসপুর সংবাদ",
  ],
  ta: [
    "ராய்பூர் செய்தி",
    "சத்தீஸ்கர் அரசியல்",
    "சத்தீஸ்கர் பட்ஜெட்",
  ],
  ur: [
    "رائےپور خبریں",
    "چھتیس گڑھ سیاست",
    "چھتیس گڑھ بجٹ",
  ],
};

export function getTrendingSearchesForLanguage(
  language: NewsroomLanguage,
  limit = 8
): string[] {
  return (BY_LANG[language] ?? BY_LANG.hi).slice(0, limit);
}
