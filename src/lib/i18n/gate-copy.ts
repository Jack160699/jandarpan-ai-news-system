/**
 * Monolingual language-gate copy — never mixed inside the modal.
 * Locale key matches the browser-detected gate UI language.
 */

export type GateCopyLocale = "en" | "hi" | "bn" | "mr" | "ta" | "ur";

export type GateCopy = {
  welcome: string;
  title: string;
  subtitle: string;
  confirm: string;
  hint: string;
};

const GATE_COPY: Record<GateCopyLocale, GateCopy> = {
  en: {
    welcome: "Welcome to Jan Darpan",
    title: "Choose Your Language",
    subtitle: "Read Chhattisgarh news in your preferred language",
    confirm: "Continue",
    hint: "You can change language anytime from the menu",
  },
  hi: {
    welcome: "जन दर्पण में आपका स्वागत है",
    title: "अपनी भाषा चुनें",
    subtitle: "छत्तीसगढ़ की खबरें अपनी पसंदीदा भाषा में पढ़ें",
    confirm: "आगे बढ़ें",
    hint: "भाषा कभी भी मेन्यू से बदल सकते हैं",
  },
  bn: {
    welcome: "জন দর্পণে স্বাগতম",
    title: "আপনার ভাষা বেছে নিন",
    subtitle: "ছত্তীসগড়ের খবর আপনার ভাষায় পড়ুন",
    confirm: "এগিয়ে যান",
    hint: "যেকোনো সময় মেনু থেকে ভাষা পরিবর্তন করুন",
  },
  mr: {
    welcome: "जन दर्पण मध्ये स्वागत",
    title: "तुमची भाषा निवडा",
    subtitle: "छत्तीसगढच्या बातम्या तुमच्या भाषेत वाचा",
    confirm: "पुढे जा",
    hint: "भाषा कधीही मेन्यूमधून बदलता येते",
  },
  ta: {
    welcome: "ஜன் தர்பணுக்கு வரவேற்கிறோம்",
    title: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
    subtitle: "சத்தீஸ்கர் செய்திகளை உங்கள் மொழியில் படியுங்கள்",
    confirm: "தொடரவும்",
    hint: "மெனுவில் எப்போதும் மொழியை மாற்றலாம்",
  },
  ur: {
    welcome: "جن درپن میں خوش آمدید",
    title: "اپنی زبان منتخب کریں",
    subtitle: "چھتیس گڑھ کی خبریں اپنی زبان میں پڑھیں",
    confirm: "جاری رکھیں",
    hint: "زبان کسی بھی وقت مینو سے بدل سکتے ہیں",
  },
};

export function gateCopyLocaleFromLanguage(lang: string): GateCopyLocale {
  if (lang === "hi" || lang === "cg") return "hi";
  if (lang === "bn") return "bn";
  if (lang === "mr") return "mr";
  if (lang === "ta") return "ta";
  if (lang === "ur") return "ur";
  return "en";
}

export function getGateCopy(locale: GateCopyLocale): GateCopy {
  return GATE_COPY[locale];
}

export function getGateCopyForBrowser(): GateCopy {
  const tag =
    typeof navigator !== "undefined"
      ? navigator.language?.toLowerCase() ?? "en"
      : "en";
  const base = tag.split("-")[0];
  const locale = gateCopyLocaleFromLanguage(base);
  return GATE_COPY[locale];
}
