/**
 * Number → spoken words in Indian conventions (thousand / lakh / crore), for Hindi and English.
 * Raw digit strings such as "125000" or "1,25,000" are ambiguous to a TTS engine; spelling the
 * quantity out guarantees the diction a newsreader would use.
 */

const HI_0_99 = [
  "शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ",
  "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस",
  "बीस", "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस",
  "तीस", "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस",
  "चालीस", "इकतालीस", "बयालीस", "तैंतालीस", "चौवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास",
  "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ",
  "साठ", "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर",
  "सत्तर", "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उनासी",
  "अस्सी", "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी", "अट्ठासी", "नवासी",
  "नब्बे", "इक्यानवे", "बानवे", "तिरानवे", "चौरानवे", "पंचानवे", "छियानवे", "सत्तानवे", "अट्ठानवे", "निन्यानवे",
];

const EN_0_19 = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
  "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function en99(n: number): string {
  if (n < 20) return EN_0_19[n]!;
  const t = EN_TENS[Math.floor(n / 10)]!;
  return n % 10 ? `${t}-${EN_0_19[n % 10]}` : t;
}

function en999(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${EN_0_19[h]} hundred`);
  if (r) parts.push(h ? `and ${en99(r)}` : en99(r));
  return parts.join(" ");
}

/** Indian grouping: crore (1e7), lakh (1e5), thousand, then hundreds. */
function indianGroups(n: number): { crore: number; lakh: number; thousand: number; rest: number } {
  return {
    crore: Math.floor(n / 10_000_000),
    lakh: Math.floor((n % 10_000_000) / 100_000),
    thousand: Math.floor((n % 100_000) / 1_000),
    rest: n % 1_000,
  };
}

export function numberToEnglishIndian(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99_99_99_999) return String(n);
  if (n === 0) return "zero";
  const g = indianGroups(n);
  const parts: string[] = [];
  const big = (v: number): string => (v >= 100 ? en999(v) : en99(v));
  if (g.crore) parts.push(`${big(g.crore)} crore`);
  if (g.lakh) parts.push(`${en99(g.lakh)} lakh`);
  if (g.thousand) parts.push(`${en99(g.thousand)} thousand`);
  if (g.rest) parts.push(en999(g.rest));
  return parts.join(" ");
}

function hi999(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${HI_0_99[h]} सौ`);
  if (r) parts.push(HI_0_99[r]!);
  return parts.join(" ");
}

export function numberToHindi(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99_99_99_999) return String(n);
  if (n === 0) return "शून्य";
  const g = indianGroups(n);
  const parts: string[] = [];
  const big = (v: number): string => (v >= 100 ? hi999(v) : HI_0_99[v]!);
  if (g.crore) parts.push(`${big(g.crore)} करोड़`);
  if (g.lakh) parts.push(`${HI_0_99[g.lakh]} लाख`);
  if (g.thousand) parts.push(`${HI_0_99[g.thousand]} हज़ार`);
  if (g.rest) parts.push(hi999(g.rest));
  return parts.join(" ");
}

export function numberToWords(n: number, language: "hi" | "en"): string {
  return language === "hi" ? numberToHindi(n) : numberToEnglishIndian(n);
}
