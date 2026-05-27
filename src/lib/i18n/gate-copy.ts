/**
 * Monolingual language-gate copy — never mixed inside the modal.
 */

export type GateCopyLocale = "en" | "hi" | "cg" | "bn" | "mr" | "ta" | "ur";

export type GateLegalCopy = {
  agreeIntro: string;
  terms: string;
  privacy: string;
  cookies: string;
  ads: string;
  disclaimer: string;
};

export type GateCopy = {
  welcome: string;
  title: string;
  subtitle: string;
  confirm: string;
  hint: string;
  legal: GateLegalCopy;
};

const GATE_COPY: Record<GateCopyLocale, GateCopy> = {
  en: {
    welcome: "Welcome to Jan Darpan",
    title: "Choose Your Language",
    subtitle: "Your Chhattisgarh newsroom — curated for you",
    confirm: "Continue",
    hint: "Change language anytime from the menu",
    legal: {
      agreeIntro: "I agree to the",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      cookies: "Cookie Policy",
      ads: "Personalized Ads Policy",
      disclaimer:
        "By continuing, you consent to personalized content, cookies, and ad experiences.",
    },
  },
  cg: {
    welcome: "जन दर्पण में आपका स्वागत",
    title: "अपनी भाषा चुनौ",
    subtitle: "छत्तीसगढ़ के खबर — आपके मन के मुताबिक",
    confirm: "आगे बढ़ौ",
    hint: "भाषा कभू मेन्यू से बदल सकत हौ",
    legal: {
      agreeIntro: "हमर साथ सहमत हौं",
      terms: "नियम व शर्त",
      privacy: "गोपनीयता नीति",
      cookies: "कुकी नीति",
      ads: "व्यक्तिगत विज्ञापन नीति",
      disclaimer:
        "आगे बढ़ते आप सामग्री, कुकी अउ विज्ञापन अनुभव के लिए सहमति देत हौ।",
    },
  },
  hi: {
    welcome: "जन दर्पण में आपका स्वागत है",
    title: "अपनी भाषा चुनें",
    subtitle: "छत्तीसगढ़ की खबरें — आपके अनुसार",
    confirm: "आगे बढ़ें",
    hint: "भाषा कभी भी मेन्यू से बदल सकते हैं",
    legal: {
      agreeIntro: "मैं सहमत हूँ",
      terms: "नियम और शर्तें",
      privacy: "गोपनीयता नीति",
      cookies: "कुकी नीति",
      ads: "व्यक्तिगत विज्ञापन नीति",
      disclaimer:
        "जारी रखने पर आप सामग्री, कुकी और विज्ञापन अनुभव के लिए सहमति देते हैं।",
    },
  },
  bn: {
    welcome: "জন দর্পণে স্বাগতম",
    title: "আপনার ভাষা বেছে নিন",
    subtitle: "ছত্তীসগড়ের খবর — আপনার মতো",
    confirm: "এগিয়ে যান",
    hint: "যেকোনো সময় মেনু থেকে ভাষা পরিবর্তন করুন",
    legal: {
      agreeIntro: "আমি সম্মত",
      terms: "শর্তাবলী",
      privacy: "গোপনীয়তা নীতি",
      cookies: "কুকি নীতি",
      ads: "ব্যক্তিগত বিজ্ঞাপন নীতি",
      disclaimer:
        "চালিয়ে গেলে আপনি কন্টেন্ট, কুকি ও বিজ্ঞাপন অভিজ্ঞতায় সম্মতি দিচ্ছেন।",
    },
  },
  mr: {
    welcome: "जन दर्पण मध्ये स्वागत",
    title: "तुमची भाषा निवडा",
    subtitle: "छत्तीसगढच्या बातम्या — तुमच्या पद्धतीने",
    confirm: "पुढे जा",
    hint: "भाषा कधीही मेन्यूमधून बदलता येते",
    legal: {
      agreeIntro: "मी सहमत आहे",
      terms: "अटी व शर्ती",
      privacy: "गोपनीयता धोरण",
      cookies: "कुकी धोरण",
      ads: "वैयक्तिक जाहिरात धोरण",
      disclaimer:
        "पुढे जाताना तुम्ही सामग्री, कुकी आणि जाहिरात अनुभवास संमती देता.",
    },
  },
  ta: {
    welcome: "ஜன் தர்பணுக்கு வரவேற்கிறோம்",
    title: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
    subtitle: "சத்தீஸ்கர் செய்திகள் — உங்கள் விருப்பப்படி",
    confirm: "தொடரவும்",
    hint: "மெனுவில் எப்போதும் மொழியை மாற்றலாம்",
    legal: {
      agreeIntro: "நான் ஒப்புக்கொள்கிறேன்",
      terms: "விதிமுறைகள்",
      privacy: "தனியுரிமைக் கொள்கை",
      cookies: "குக்கீ கொள்கை",
      ads: "தனிப்பயன் விளம்பரக் கொள்கை",
      disclaimer:
        "தொடர்வதன் மூலம் உள்ளடக்கம், குக்கீகள் மற்றும் விளம்பர அனுபவத்திற்கு ஒப்புதல் அளிக்கிறீர்கள்.",
    },
  },
  ur: {
    welcome: "جن درپن میں خوش آمدید",
    title: "اپنی زبان منتخب کریں",
    subtitle: "چھتیس گڑھ کی خبریں — آپ کے انداز میں",
    confirm: "جاری رکھیں",
    hint: "زبان کبھی بھی مینو سے تبدیل کی جا سکتی ہے",
    legal: {
      agreeIntro: "میں متفق ہوں",
      terms: "شرائط و ضوابط",
      privacy: "رازداری پالیسی",
      cookies: "کوکی پالیسی",
      ads: "ذاتی اشتہار پالیسی",
      disclaimer:
        "جاری رکھنے سے آپ مواد، کوکیز اور اشتہاری تجربے کے لیے رضامندی دیتے ہیں۔",
    },
  },
};

export function gateCopyLocaleFromLanguage(lang: string): GateCopyLocale {
  if (lang === "cg") return "cg";
  if (lang === "hi") return "hi";
  if (lang === "bn") return "bn";
  if (lang === "mr") return "mr";
  if (lang === "ta") return "ta";
  if (lang === "ur") return "ur";
  return "en";
}

export function getGateCopy(locale: GateCopyLocale): GateCopy {
  return GATE_COPY[locale];
}
