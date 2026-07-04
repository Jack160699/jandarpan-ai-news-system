/**
 * Entity and people detection for contextual editorial image prompts
 */

export type EditorialStoryTheme =
  | "crime"
  | "politics"
  | "sports"
  | "business"
  | "technology"
  | "education"
  | "health"
  | "entertainment"
  | "weather"
  | "breaking"
  | "opinion"
  | "festival"
  | "government"
  | "economy"
  | "accident"
  | "election"
  | "general";

export type DetectedEntities = {
  theme: EditorialStoryTheme;
  people: string[];
  organizations: string[];
  keywords: string[];
  isBreaking: boolean;
};

const THEME_PATTERNS: Array<{ theme: EditorialStoryTheme; re: RegExp }> = [
  { theme: "breaking", re: /\b(breaking|flash|urgent|live update|ताज़ा|ब्रेकिंग)\b/i },
  { theme: "crime", re: /\b(crime|murder|theft|robbery|arrest|police|court case|हत्या|चोरी|गिरफ्तार|पुलिस)\b/i },
  { theme: "accident", re: /\b(accident|collision|crash|injured|dead|मृत|हादसा|दुर्घटना)\b/i },
  { theme: "election", re: /\b(election|poll|voting|ballot|candidate|चुनाव|मतदान|उम्मीदवार)\b/i },
  { theme: "politics", re: /\b(politics|political|party|mla|mp|minister|assembly|विधानसभा|मंत्री|राजनीति)\b/i },
  { theme: "government", re: /\b(government|scheme|policy|administration|yojana|सरकार|योजना|प्रशासन)\b/i },
  { theme: "sports", re: /\b(cricket|football|match|tournament|ipl|olympic|खेल|क्रिकेट|मैच)\b/i },
  { theme: "business", re: /\b(business|company|industry|market|startup|corporate|व्यापार|उद्योग)\b/i },
  { theme: "economy", re: /\b(economy|inflation|gdp|budget|tax|finance|अर्थव्यवस्था|बजट)\b/i },
  { theme: "technology", re: /\b(technology|digital|software|ai|internet|tech|प्रौद्योगिकी|डिजिटल)\b/i },
  { theme: "education", re: /\b(education|school|college|university|exam|student|शिक्षा|स्कूल|परीक्षा)\b/i },
  { theme: "health", re: /\b(health|hospital|doctor|disease|vaccine|medical|स्वास्थ्य|अस्पताल|बीमारी)\b/i },
  { theme: "weather", re: /\b(weather|rain|monsoon|storm|flood|heat|cold|मौसम|बारिश|बाढ़)\b/i },
  { theme: "festival", re: /\b(festival|celebration|diwali|holi|navratri|puja|त्योहार|उत्सव)\b/i },
  { theme: "entertainment", re: /\b(film|movie|music|celebrity|entertainment|bollywood|फिल्म|सिनेमा)\b/i },
  { theme: "opinion", re: /\b(opinion|editorial|column|analysis|viewpoint|विश्लेषण|राय)\b/i },
];

const ORG_PATTERNS = [
  /\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g,
  /\b(police|administration|municipal corporation|nagar nigam|panchayat|विधानसभा|नगर निगम)\b/gi,
  /\b(bjp|congress|aap|cpi|cpm|jcc)\b/gi,
];

const PERSON_TITLE_RE =
  /\b(?:cm|pm|minister|mla|mp|collector|sp|dg|chief|mayor|sarpanch)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "news", "report",
  "said", "after", "before", "today", "yesterday",
]);

function extractKeywords(text: string, limit = 8): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

export function detectEditorialEntities(input: {
  headline: string;
  summary?: string | null;
  body?: string | null;
  category?: string | null;
  urgencyScore?: number;
}): DetectedEntities {
  const combined = [input.headline, input.summary, input.body]
    .filter(Boolean)
    .join(" ");

  let theme: EditorialStoryTheme = "general";
  for (const { theme: t, re } of THEME_PATTERNS) {
    if (re.test(combined)) {
      theme = t;
      break;
    }
  }

  if (theme === "general" && input.category) {
    const cat = input.category.toLowerCase();
    if (cat in THEME_PATTERNS.map((p) => p.theme)) {
      theme = cat as EditorialStoryTheme;
    } else if (["local", "world"].includes(cat)) {
      theme = cat === "world" ? "general" : "government";
    }
  }

  const isBreaking =
    theme === "breaking" ||
    (input.urgencyScore ?? 0) >= 80 ||
    /\b(breaking|urgent|flash)\b/i.test(input.headline);

  const people: string[] = [];
  let match: RegExpExecArray | null;
  const personRe = new RegExp(PERSON_TITLE_RE.source, "g");
  while ((match = personRe.exec(combined)) !== null) {
    if (match[1]) people.push(match[1]);
  }

  const organizations: string[] = [];
  for (const re of ORG_PATTERNS) {
    const orgRe = new RegExp(re.source, re.flags);
    while ((match = orgRe.exec(combined)) !== null) {
      const org = (match[1] ?? match[0]).trim();
      if (org.length > 2 && org.length < 60) organizations.push(org);
    }
  }

  return {
    theme: isBreaking && theme !== "accident" ? "breaking" : theme,
    people: [...new Set(people)].slice(0, 5),
    organizations: [...new Set(organizations)].slice(0, 6),
    keywords: extractKeywords(combined),
    isBreaking,
  };
}
