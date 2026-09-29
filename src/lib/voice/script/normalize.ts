/**
 * Deterministic text normalisation for broadcast scripts:
 * strip web-only elements → expand abbreviations → currency/units → dates → numbers.
 * Pure functions; no I/O.
 */

import { numberToWords } from "@/lib/voice/script/numbers";

export type ScriptLang = "hi" | "en";

// ------------------------------------------------------------------ web junk

const JUNK_LINE_PATTERNS: RegExp[] = [
  /^\s*(?:स्रोत|source|फोटो|photo|सौजन्य|courtesy|credit|क्रेडिट|रिपोर्टर|reporter|ब्यूरो|image|इमेज|फाइल फोटो|file photo)\s*[:：].*$/gim,
  /^\s*(?:ये भी पढ़ें|यह भी पढ़ें|इसे भी पढ़ें|पढ़ें|और पढ़ें|also read|read more|read also|click here|advertisement|विज्ञापन|sponsored|follow us|फॉलो करें|सब्सक्राइब|subscribe|share this|शेयर करें)(?![\p{L}\p{M}]).*$/gimu,
  /^\s*(?:join|जुड़ें|हमारे)\s.*(?:whatsapp|telegram|व्हाट्सएप|टेलीग्राम|चैनल).*$/gim,
  /^\s*(?:tags?|टैग्स?|labels?)\s*[:：].*$/gim,
  /जन दर्पण ब्यूरो द्वारा सत्यापित स्थानीय कवरेज।?/g,
];

export function stripWebJunk(input: string): string {
  let t = input ?? "";
  t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  t = t.replace(/<[^>]*>/g, " ");
  t = t.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, " "); // markdown images
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"); // markdown links → text
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/^\s*>\s?/gm, "").replace(/^\s*[-*+]\s+/gm, "");
  t = t.replace(/(\*\*|__|\*|_|~~|`)/g, "");
  for (const re of JUNK_LINE_PATTERNS) t = t.replace(re, " ");
  t = t.replace(/\bhttps?:\/\/\S+/gi, " ").replace(/\bwww\.\S+/gi, " ");
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, " ");
  t = t.replace(/#([\p{L}\p{M}\p{N}_]+)/gu, "$1").replace(/(^|\s)@[\w.]+/g, " ");
  // emoji & pictographs, zero-width chars
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}​-‍⁠]/gu, "");
  return t.replace(/[ \t\r\f\v]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ------------------------------------------------------------------ abbreviations

const HI_ABBR: Array<[RegExp, string]> = [
  [/\bCM\b/g, "मुख्यमंत्री"],
  [/\bPM\b(?!\s*\d)/g, "प्रधानमंत्री"],
  [/\bSP\b/g, "पुलिस अधीक्षक"],
  [/\bDM\b/g, "जिलाधिकारी"],
  [/\bDIG\b/g, "डीआईजी"],
  [/\bIG\b/g, "आईजी"],
  [/\bBJP\b/g, "भाजपा"],
  [/\bINC\b/g, "कांग्रेस"],
  [/\bGST\b/g, "जीएसटी"],
  [/\bIPL\b/g, "आईपीएल"],
  [/\bIPS\b/g, "आईपीएस"],
  [/\bIAS\b/g, "आईएएस"],
  [/\bCBI\b/g, "सीबीआई"],
  [/\bNIA\b/g, "एनआईए"],
  [/\bED\b/g, "ईडी"],
  [/\bFIR\b/g, "एफआईआर"],
  [/\bCRPF\b/g, "सीआरपीएफ"],
  [/\bNDRF\b/g, "एनडीआरएफ"],
  [/\bAIIMS\b/g, "एम्स"],
  [/\bNH\b/g, "राष्ट्रीय राजमार्ग"],
  [/\bRTO\b/g, "आरटीओ"],
  [/\bUPI\b/g, "यूपीआई"],
  [/\bRBI\b/g, "आरबीआई"],
  [/\bISRO\b/g, "इसरो"],
  [/\bCG\b/g, "छत्तीसगढ़"],
];

const EN_ABBR: Array<[RegExp, string]> = [
  [/\bCM\b/g, "Chief Minister"],
  [/\bSP\b/g, "Superintendent of Police"],
  [/\bDM\b/g, "District Magistrate"],
  [/\bDr\.(?=\s)/g, "Doctor"],
  [/\bMr\.(?=\s)/g, "Mister"],
  [/\bMrs\.(?=\s)/g, "Missus"],
  [/\bGovt\.?(?=\s)/gi, "Government"],
  [/\bvs\.?(?=\s)/gi, "versus"],
  [/\bNH\b/g, "National Highway"],
  [/\bCG\b/g, "Chhattisgarh"],
];

/** Names/tokens that must not be rewritten (protected via placeholders around the expansion pass). */
export function expandAbbreviations(text: string, lang: ScriptLang, protectedTerms: readonly string[] = []): string {
  const holders: string[] = [];
  let t = text;
  for (const term of [...protectedTerms].filter((x) => x && x.length > 1).sort((a, b) => b.length - a.length)) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    t = t.replace(re, () => {
      holders.push(term);
      return `\u0001${holders.length - 1}\u0002`;
    });
  }
  for (const [re, rep] of lang === "hi" ? HI_ABBR : EN_ABBR) t = t.replace(re, rep);
  return t.replace(/\u0001(\d+)\u0002/g, (_m, i) => holders[Number(i)] ?? "");
}

// ------------------------------------------------------------------ currency / units / percent

export function normalizeUnits(text: string, lang: ScriptLang): string {
  let t = text;
  if (lang === "hi") {
    t = t.replace(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)(\s*(?:करोड़|लाख|हज़ार|हजार|अरब))?/gi, (_m, n: string, unit?: string) =>
      `${n}${unit ?? ""} रुपये`
    );
    t = t.replace(/([\d,.]+)\s*%/g, "$1 प्रतिशत");
    t = t.replace(/([\d.]+)\s*°\s*C\b/gi, "$1 डिग्री सेल्सियस");
    t = t.replace(/([\d.,]+)\s*(?:km|कि\.मी\.?|किमी)\b/gi, "$1 किलोमीटर");
    t = t.replace(/([\d.,]+)\s*kg\b/gi, "$1 किलोग्राम");
    t = t.replace(/([\d.,]+)\s*mm\b/gi, "$1 मिलीमीटर");
    t = t.replace(/([\d.,]+)\s*(?:hrs?|hours?)\b/gi, "$1 घंटे");
  } else {
    t = t.replace(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)(\s*(?:crore|lakh|thousand|billion))?/gi, (_m, n: string, unit?: string) =>
      `${n}${unit ?? ""} rupees`
    );
    t = t.replace(/([\d,.]+)\s*%/g, "$1 percent");
    t = t.replace(/([\d.]+)\s*°\s*C\b/gi, "$1 degrees Celsius");
    t = t.replace(/([\d.,]+)\s*km\b/gi, "$1 kilometres");
    t = t.replace(/([\d.,]+)\s*kg\b/gi, "$1 kilograms");
    t = t.replace(/([\d.,]+)\s*mm\b/gi, "$1 millimetres");
  }
  return t;
}

// ------------------------------------------------------------------ dates & times

const HI_MONTHS = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const validDay = (d: number, m: number) => d >= 1 && d <= 31 && m >= 1 && m <= 12;

export function normalizeDates(text: string, lang: ScriptLang): string {
  const months = lang === "hi" ? HI_MONTHS : EN_MONTHS;
  const fmt = (d: number, m: number, y?: number) => `${d} ${months[m - 1]}${y ? ` ${y}` : ""}`;
  let t = text;
  // ISO 2026-09-29
  t = t.replace(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g, (m0, y, mo, d) => (validDay(+d, +mo) ? fmt(+d, +mo, +y) : m0));
  // Indian day-first 29/09/2026, 29-09-2026, 29.09.2026
  t = t.replace(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/g, (m0, d, mo, y) => (validDay(+d, +mo) ? fmt(+d, +mo, +y) : m0));
  return t;
}

export function normalizeTimes(text: string, lang: ScriptLang): string {
  if (lang === "hi") {
    return text
      .replace(/\b(\d{1,2}(?::\d{2})?)\s*(?:AM|a\.m\.)/gi, "सुबह $1 बजे")
      .replace(/\b(\d{1,2}(?::\d{2})?)\s*(?:PM|p\.m\.)/gi, (_m, t: string) => {
        const hour = parseInt(t, 10);
        // 12–3:59 दोपहर, 4–7:59 शाम, 8–11:59 रात
        const part = hour === 12 || hour < 4 ? "दोपहर" : hour < 8 ? "शाम" : "रात";
        return `${part} ${t} बजे`;
      });
  }
  return text.replace(/\b(\d{1,2}(?::\d{2})?)\s*a\.m\./gi, "$1 AM").replace(/\b(\d{1,2}(?::\d{2})?)\s*p\.m\./gi, "$1 PM");
}

// ------------------------------------------------------------------ numbers

/**
 * Spell out large plain quantities in Indian words. Deliberately skips: years (1900–2100),
 * numbers glued to letters/hyphens/slashes (IDs, plates, phone numbers), decimals, and 10+ digit runs.
 */
export function normalizeNumbers(text: string, lang: ScriptLang): string {
  return text.replace(
    /(?<![\w./:-])(\d{1,3}(?:,\d{2,3})+|\d{4,9})(?![\w./:-]|,\d|\.\d)/g,
    (m0: string, raw: string) => {
      const plain = raw.replace(/,/g, "");
      const n = Number(plain);
      if (!Number.isFinite(n)) return m0;
      if (plain.length === 4 && n >= 1900 && n <= 2100) return m0; // a year
      if (plain.length > 9) return m0;
      return numberToWords(n, lang);
    }
  );
}

export function normalizeForSpeech(text: string, lang: ScriptLang, protectedTerms: readonly string[] = []): string {
  let t = stripWebJunk(text);
  t = expandAbbreviations(t, lang, protectedTerms);
  t = normalizeUnits(t, lang);
  t = normalizeDates(t, lang);
  t = normalizeTimes(t, lang);
  t = normalizeNumbers(t, lang);
  return t.replace(/[ \t]+/g, " ").replace(/\s+([,;:।.!?])/g, "$1").trim();
}
