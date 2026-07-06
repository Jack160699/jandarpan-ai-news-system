/**
 * Editorial desk taxonomy — homepage composition only (not ranking)
 */

import { geoFromRecord } from "@/lib/regional";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { HomeArticle } from "@/lib/homepage/types";
import {
  resolveFeaturedDistrictSlug,
} from "@/lib/homepage/district-filter";

export type EditorialDeskId =
  | "hero"
  | "breaking"
  | "top-stories"
  | "politics"
  | "crime"
  | "business"
  | "technology"
  | "sports"
  | "entertainment"
  | "education"
  | "health"
  | "fact-check"
  | "opinion"
  | "explainers"
  | "district"
  | "national"
  | "international"
  | "weather"
  | "election";

export type EditorialDeskDef = {
  id: EditorialDeskId;
  label: string;
  labelHi: string;
  quota: number;
  optional?: boolean;
  matchers: RegExp[];
};

/** Districts balanced on homepage — composition caps (broader than featured UI tabs) */
export const EDITORIAL_BALANCE_DISTRICTS = [
  "raipur",
  "bilaspur",
  "jagdalpur",
  "korba",
  "durg",
  "rajnandgaon",
  "ambikapur",
  "bastar",
] as const;

export type EditorialBalanceDistrictSlug = (typeof EDITORIAL_BALANCE_DISTRICTS)[number];

export const EDITORIAL_DESKS: EditorialDeskDef[] = [
  {
    id: "politics",
    label: "Politics",
    labelHi: "राजनीति",
    quota: 3,
    matchers: [
      /politic/i,
      /राजनीति/i,
      /मंत्री/i,
      /विधानसभा/i,
      /सरकार/i,
      /कांग्रेस/i,
      /भाजपा/i,
      /congress/i,
      /\bbjp\b/i,
      /cabinet/i,
      /parliament/i,
      /लोकसभा/i,
      /विधायक/i,
    ],
  },
  {
    id: "crime",
    label: "Crime",
    labelHi: "अपराध",
    quota: 2,
    matchers: [
      /crime/i,
      /murder/i,
      /arrest/i,
      /police/i,
      /हत्या/i,
      /पुलिस/i,
      /अपराध/i,
      /गिरफ्तार/i,
      /चोरी/i,
      /rape/i,
      /दुष्कर्म/i,
      /encounter/i,
    ],
  },
  {
    id: "business",
    label: "Business",
    labelHi: "व्यापार",
    quota: 3,
    matchers: [
      /business/i,
      /economy/i,
      /market/i,
      /व्यापार/i,
      /अर्थव्यवस्था/i,
      /industry/i,
      /steel/i,
      /coal/i,
      /ipo/i,
      /stock/i,
      /share/i,
    ],
  },
  {
    id: "technology",
    label: "Technology",
    labelHi: "तकनीक",
    quota: 2,
    matchers: [
      /technolog/i,
      /digital/i,
      /\bai\b/i,
      /smartphone/i,
      /तकनीक/i,
      /डिजिटल/i,
      /स्मार्टफोन/i,
      /startup/i,
      /cyber/i,
      /app\b/i,
    ],
  },
  {
    id: "sports",
    label: "Sports",
    labelHi: "खेल",
    quota: 3,
    matchers: [
      /sport/i,
      /cricket/i,
      /खेल/i,
      /क्रिकेट/i,
      /match/i,
      /tournament/i,
      /ipl/i,
      /football/i,
    ],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    labelHi: "मनोरंजन",
    quota: 2,
    matchers: [
      /entertainment/i,
      /bollywood/i,
      /film/i,
      /movie/i,
      /celebrity/i,
      /सिनेमा/i,
      /मनोरंजन/i,
      /actor/i,
      /actress/i,
    ],
  },
  {
    id: "education",
    label: "Education",
    labelHi: "शिक्षा",
    quota: 2,
    matchers: [
      /education/i,
      /school/i,
      /university/i,
      /शिक्षा/i,
      /स्कूल/i,
      /exam/i,
      /student/i,
      /college/i,
      /परीक्षा/i,
    ],
  },
  {
    id: "health",
    label: "Health",
    labelHi: "स्वास्थ्य",
    quota: 2,
    matchers: [
      /health/i,
      /hospital/i,
      /disease/i,
      /medical/i,
      /स्वास्थ्य/i,
      /अस्पताल/i,
      /बीमारी/i,
      /doctor/i,
      /vaccine/i,
    ],
  },
  {
    id: "fact-check",
    label: "Fact Check",
    labelHi: "तथ्य जांच",
    quota: 1,
    matchers: [
      /fact[\s-]?check/i,
      /verified/i,
      /misinformation/i,
      /तथ्य/i,
      /फैक्ट/i,
      /claim/i,
      /viral claim/i,
    ],
  },
  {
    id: "opinion",
    label: "Opinion",
    labelHi: "विचार",
    quota: 1,
    matchers: [
      /opinion/i,
      /editorial/i,
      /analysis/i,
      /commentary/i,
      /विचार/i,
      /विश्लेषण/i,
      /column/i,
    ],
  },
  {
    id: "explainers",
    label: "Explainers",
    labelHi: "समझाइए",
    quota: 1,
    matchers: [
      /explainer/i,
      /what is/i,
      /how does/i,
      /क्यों/i,
      /कैसे/i,
      /समझाइए/i,
      /guide to/i,
      /in depth/i,
    ],
  },
  {
    id: "weather",
    label: "Weather",
    labelHi: "मौसम",
    quota: 1,
    optional: true,
    matchers: [
      /weather/i,
      /monsoon/i,
      /rainfall/i,
      /मौसम/i,
      /बारिश/i,
      /मानसून/i,
      /temperature/i,
      /heatwave/i,
    ],
  },
  {
    id: "election",
    label: "Election",
    labelHi: "चुनाव",
    quota: 1,
    optional: true,
    matchers: [
      /election/i,
      /poll\b/i,
      /voting/i,
      /ballot/i,
      /चुनाव/i,
      /मतदान/i,
      /nomination/i,
    ],
  },
];

const DESK_BY_ID = new Map(EDITORIAL_DESKS.map((d) => [d.id, d]));

const TAG_DESK_MAP: Record<string, EditorialDeskId> = {
  politics: "politics",
  crime: "crime",
  business: "business",
  technology: "technology",
  sports: "sports",
  entertainment: "entertainment",
  education: "education",
  health: "health",
  "fact-check": "fact-check",
  opinion: "opinion",
  explainers: "explainers",
  weather: "weather",
  election: "election",
  local: "district",
};

function articleText(article: HomeArticle): string {
  return `${article.headline} ${article.summary} ${article.tags.join(" ")}`.toLowerCase();
}

export function isCgArticle(
  article: HomeArticle,
  row?: GeneratedArticleRow
): boolean {
  if (article.section === "chhattisgarh" || article.section === "raipur") return true;
  if (!row) return false;
  return geoFromRecord(row).is_chhattisgarh;
}

export function isNationalArticle(article: HomeArticle): boolean {
  return article.section === "india";
}

export function isInternationalArticle(article: HomeArticle): boolean {
  return article.section === "world";
}

/** Primary editorial desk for an article */
export function classifyEditorialDesk(
  article: HomeArticle,
  row?: GeneratedArticleRow
): EditorialDeskId {
  const text = articleText(article);

  for (const tag of article.tags) {
    const mapped = TAG_DESK_MAP[tag.toLowerCase()];
    if (mapped) return mapped;
  }

  for (const desk of EDITORIAL_DESKS) {
    if (desk.matchers.some((re) => re.test(text))) return desk.id;
  }

  if (article.section === "sports") return "sports";
  if (article.section === "business") return "business";
  if (article.section === "education") return "education";

  if (isInternationalArticle(article)) return "international";
  if (isNationalArticle(article)) return "national";

  if (isCgArticle(article, row) && resolveFeaturedDistrictSlug(article)) {
    return "district";
  }

  if (isCgArticle(article, row)) return "district";

  return "national";
}

export function resolveArticleDistrictSlug(
  article: HomeArticle
): EditorialBalanceDistrictSlug | null {
  return resolveBalanceDistrictSlug(article);
}

const BALANCE_DISTRICT_ALIASES: Record<EditorialBalanceDistrictSlug, string[]> = {
  raipur: ["raipur", "रायपुर", "naya raipur", "नया रायपुर"],
  bilaspur: ["bilaspur", "बिलासपुर"],
  jagdalpur: ["jagdalpur", "जगदलपुर"],
  korba: ["korba", "कोरबा"],
  durg: ["durg", "दुर्ग", "bhilai", "भिलाई"],
  rajnandgaon: ["rajnandgaon", "राजनांदगाँव", "राजनांदगांव"],
  ambikapur: ["ambikapur", "अंबिकापुर", "surguja", "सरगुजा"],
  bastar: ["bastar", "बस्तर"],
};

export function resolveBalanceDistrictSlug(
  article: HomeArticle
): EditorialBalanceDistrictSlug | null {
  const text = articleText(article);
  for (const slug of EDITORIAL_BALANCE_DISTRICTS) {
    if (BALANCE_DISTRICT_ALIASES[slug].some((alias) => text.includes(alias.toLowerCase()))) {
      return slug;
    }
  }
  const featured = resolveFeaturedDistrictSlug(article);
  if (featured && EDITORIAL_BALANCE_DISTRICTS.includes(featured as EditorialBalanceDistrictSlug)) {
    return featured as EditorialBalanceDistrictSlug;
  }
  return null;
}

export function balanceDistrictSlug(article: HomeArticle): EditorialBalanceDistrictSlug {
  return (
    resolveBalanceDistrictSlug(article) ??
    EDITORIAL_BALANCE_DISTRICTS[
      Math.abs(article.id.charCodeAt(0)) % EDITORIAL_BALANCE_DISTRICTS.length
    ]
  );
}

export function getDeskDef(id: EditorialDeskId): EditorialDeskDef | undefined {
  return DESK_BY_ID.get(id);
}

export function groupArticlesByDesk(
  articles: HomeArticle[],
  rowsById: Map<string, GeneratedArticleRow>
): Map<EditorialDeskId, HomeArticle[]> {
  const groups = new Map<EditorialDeskId, HomeArticle[]>();

  for (const article of articles) {
    const desk = classifyEditorialDesk(article, rowsById.get(article.id));
    const list = groups.get(desk) ?? [];
    list.push(article);
    groups.set(desk, list);
  }

  return groups;
}
