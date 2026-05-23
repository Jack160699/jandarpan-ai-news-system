/**
 * AI anchor lines — opening hooks for news shorts
 */

import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { HomeSectionId } from "@/lib/homepage/types";

const ANCHOR_TEMPLATES: Record<
  NewsroomLanguage,
  Record<HomeSectionId | "default", string[]>
> = {
  hi: {
    default: ["एक मिनट में खास खबर।", "ताज़ा अपडेट, सीधे आपके लिए।"],
    chhattisgarh: ["छत्तीसगढ़ की बड़ी खबर — एक मिनट में।"],
    raipur: ["रायपुर डेस्क — तुरंत अपडेट।"],
    india: ["देश की महत्वपूर्ण खबर।"],
    world: ["दुनिया से ताज़ा खबर।"],
    business: ["बाज़ार और अर्थव्यवस्था — संक्षेप में।"],
    sports: ["खेल जगत की हलचल।"],
    education: ["शिक्षा और परीक्षा — ताज़ा अपडेट।"],
  },
  en: {
    default: ["Your 60-second news brief.", "Quick update from the desk."],
    chhattisgarh: ["Chhattisgarh in 60 seconds."],
    raipur: ["Raipur desk — fast update."],
    india: ["National headline, condensed."],
    world: ["World wire in one minute."],
    business: ["Markets and economy — brief."],
    sports: ["Sports desk — quick take."],
    education: ["Education beat — snapshot."],
  },
  cg: {
    default: ["एक मिनट में खास खबर — छत्तीसगढ़ी डेस्क।"],
    chhattisgarh: ["छत्तीसगढ़ के माफ़िक, तुरंत खबर।"],
    raipur: ["रायपुर से ताजा अपडेट।"],
    india: ["देश भर की खबर, छोट मा समझाथे।"],
    world: ["दुनिया भर के खबर।"],
    business: ["व्यापार के खबर।"],
    sports: ["खेल के खबर।"],
    education: ["पढ़ाई के खबर।"],
  },
  mr: {
    default: ["एक मिनिटात खास बातम्य."],
    chhattisgarh: ["छत्तीसगढची बातम्य — एक मिनिटात."],
    raipur: ["रायपूर डेस्क — झटपट अपडेट."],
    india: ["देशातील महत्त्वाची बातम्य."],
    world: ["जागतिक बातम्य."],
    business: ["अर्थव्यवस्था — थोडक्यात."],
    sports: ["क्रीडा बातम्य."],
    education: ["शिक्षण बातम्य."],
  },
  bn: {
    default: ["এক মিনিটে সংবাদ।"],
    chhattisgarh: ["ছত্তিশগড়ের খবর — এক মিনিটে।"],
    raipur: ["রায়পুর ডেস্ক — দ্রুত আপডেট।"],
    india: ["জাতীয় খবর।"],
    world: ["বিশ্ব সংবাদ।"],
    business: ["ব্যবসা ও অর্থনীতি।"],
    sports: ["খেলার খবর।"],
    education: ["শিক্ষা সংবাদ।"],
  },
  ta: {
    default: ["ஒரு நிமிட செய்தி சுருக்கம்."],
    chhattisgarh: ["சத்தீஸ்கரம் — ஒரு நிமிடத்தில்."],
    raipur: ["ராய்பூர் மேல்நிலை."],
    india: ["தேசிய செய்தி."],
    world: ["உலக செய்தி."],
    business: ["வணிக சுருக்கம்."],
    sports: ["விளையாட்டு செய்தி."],
    education: ["கல்வி செய்தி."],
  },
};

export function buildAnchorLine(
  section: HomeSectionId,
  language: NewsroomLanguage,
  headline: string
): string {
  const pool =
    ANCHOR_TEMPLATES[language]?.[section] ??
    ANCHOR_TEMPLATES[language]?.default ??
    ANCHOR_TEMPLATES.hi.default;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const shortHead = headline.slice(0, 48).trim();
  return `${pick} ${shortHead}${headline.length > 48 ? "…" : ""}`;
}
