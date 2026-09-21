import type { NewsroomLanguage } from "@/lib/i18n/languages";

const BY_LANG: Record<NewsroomLanguage, string[]> = {
  en: [
    "India news today",
    "National politics",
    "Stock market updates",
    "Government schemes",
    "Technology news",
    "Budget and economy",
  ],
  hi: [
    "भारत समाचार आज",
    "देश की बड़ी खबरें",
    "राष्ट्रीय राजनीति",
    "शेयर बाजार लाइव",
    "सरकारी योजना",
    "मौसम अपडेट",
  ],
  cg: [
    "भारत समाचार आज",
    "देश के बड़े खबर",
    "राष्ट्रीय राजनीति",
    "शेयर बाजार",
    "सरकारी योजना",
    "मौसम के हाल",
  ],
  mr: [
    "भारत बातम्या आज",
    "राष्ट्रीय राजकारण",
    "शेअर बाजार",
    "सरकारी योजना",
    "हवामान अंदाज",
  ],
  bn: [
    "ভারত সংবাদ আজ",
    "জাতীয় রাজনীতি",
    "শেয়ার বাজার",
    "सरकारी প্রকল্প",
    "আবহাওয়া",
  ],
  ta: [
    "இந்தியா செய்திகள்",
    "தேசிய அரசியல்",
    "பங்குச் சந்தை",
    "அரசுத் திட்டங்கள்",
  ],
  ur: [
    "بھارت کی تازہ خبریں",
    "قومی سیاست",
    "اسٹاک مارکیٹ",
    "سرکاری اسکیمیں",
  ],
};

export function getTrendingSearchesForLanguage(
  language: NewsroomLanguage,
  limit = 8
): string[] {
  return (BY_LANG[language] ?? BY_LANG.hi).slice(0, limit);
}
