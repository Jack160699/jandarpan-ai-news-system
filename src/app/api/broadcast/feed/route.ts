import { NextRequest, NextResponse } from "next/server";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import type { HomeArticle } from "@/lib/homepage/types";
import type { BroadcastSegment } from "@/features/jd-live/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CG_SECTIONS = new Set(["chhattisgarh", "raipur"]);

const DISTRICT_NAMES_HI: Record<string, string> = {
  raipur: "रायपुर",
  durg: "दुर्ग",
  bilaspur: "बिलासपुर",
  bastar: "बस्तर",
  korba: "कोरबा",
  rajnandgaon: "राजनंदगांव",
  raigarh: "रायगढ़",
  jagdalpur: "जगदलपुर",
  ambikapur: "अंबिकापुर",
  dhamtari: "धमतरी",
  mahasamund: "महासमुंद",
  kanker: "कांकेर",
  sukma: "सुकमा",
  dantewada: "दंतेवाड़ा",
  bijapur: "बीजापुर",
  narayanpur: "नारायणपुर",
  kondagaon: "कोंडागांव",
  kabirdham: "कबीरधाम",
  balod: "बालोद",
  bemetara: "बेमेतरा",
  gariaband: "गरियाबंद",
  balodabazar: "बलौदाबाज़ार",
  janjgir: "जांजगीर",
  champa: "चांपा",
  surguja: "सरगुजा",
  jashpur: "जशपुर",
  korea: "कोरिया",
  manendragarh: "मनेंद्रगढ़",
  mohla: "मोहला-मानपुर",
  sakti: "सक्ती",
  sarangarh: "सारंगढ़",
  khairagarh: "खैरागढ़",
  chhattisgarh: "छत्तीसगढ़",
};

const SECTION_NAMES_HI: Record<string, string> = {
  chhattisgarh: "राज्य डेस्क",
  raipur: "रायपुर डेस्क",
  india: "भारत",
  world: "विश्व",
  politics: "राजनीति",
  business: "व्यापार",
  sports: "खेल",
  education: "शिक्षा",
  health: "स्वास्थ्य",
  technology: "टेक्नोलॉजी",
  entertainment: "मनोरंजन",
};

const SECTION_NAMES_EN: Record<string, string> = {
  chhattisgarh: "State Desk",
  raipur: "Raipur Desk",
  india: "National",
  world: "World",
  politics: "Politics",
  business: "Business",
  sports: "Sports",
  education: "Education",
  health: "Health",
  technology: "Technology",
  entertainment: "Entertainment",
};

/** Map a HomeArticle → BroadcastSegment according to target language */
function toSegment(a: HomeArticle, targetLang: "hi" | "en"): BroadcastSegment {
  const isDevanagari = /[\u0900-\u097F]/.test(a.headline || "");
  const districtSlug = a.tags?.find((t) => t.startsWith("district:"))?.replace("district:", "")?.toLowerCase() ?? null;
  const districtHi = districtSlug ? (DISTRICT_NAMES_HI[districtSlug] || "छत्तीसगढ़") : "छत्तीसगढ़";
  const districtEn = districtSlug ? (districtSlug.charAt(0).toUpperCase() + districtSlug.slice(1)) : "Chhattisgarh";

  const catHi = a.desk?.nameHi || SECTION_NAMES_HI[a.section] || "राज्य डेस्क";
  const catEn = a.desk?.name || SECTION_NAMES_EN[a.section] || "State Desk";

  return {
    id: a.id,
    slug: a.slug,
    headline: targetLang === "hi" && isDevanagari ? a.headline : a.headline,
    headlineHi: isDevanagari ? a.headline : undefined,
    summary: a.summary,
    summaryHi: isDevanagari ? a.summary : undefined,
    imageUrl: a.imageUrl || a.ogImageUrl || "",
    categoryLabel: targetLang === "hi" ? catHi : catEn,
    categoryLabelHi: catHi,
    district: targetLang === "hi" ? districtHi : districtEn,
    districtHi,
    section: a.section,
    isBreaking: a.ranking?.isBreaking ?? false,
    isLive: a.isLive,
    priorityScore: a.priorityScore ?? a.trendScore ?? 0,
    publishedAt: a.publishedAt,
  };
}

/**
 * Editorial broadcast priority filtered strictly by target language:
 *  1. Breaking
 *  2. Local CG (chhattisgarh, raipur sections, district tags)
 *  3. National India
 *  4. Everything else
 */
function rankSegments(articles: HomeArticle[], targetLang: "hi" | "en"): {
  queue: BroadcastSegment[];
  breaking: BroadcastSegment[];
} {
  const isDevanagari = (str: string) => /[\u0900-\u097F]/.test(str || "");
  
  // Strictly filter pool to avoid language leakage
  const filtered = articles.filter((a) => {
    const hasDev = isDevanagari(a.headline);
    return targetLang === "hi" ? (hasDev || a.language === "hi") : (!hasDev || a.language === "en");
  });

  const pool = filtered.length >= 3 ? filtered : articles;

  const breakingArticles = pool.filter((a) => a.ranking?.isBreaking);
  const cgArticles = pool.filter(
    (a) => !a.ranking?.isBreaking && CG_SECTIONS.has(a.section)
  );
  const indiaArticles = pool.filter(
    (a) => !a.ranking?.isBreaking && !CG_SECTIONS.has(a.section) && a.section === "india"
  );
  const restArticles = pool.filter(
    (a) =>
      !a.ranking?.isBreaking &&
      !CG_SECTIONS.has(a.section) &&
      a.section !== "india"
  );

  const orderedQueue = [
    ...cgArticles.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)),
    ...indiaArticles.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)),
    ...restArticles.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)),
  ].slice(0, 10);

  return {
    queue: orderedQueue.map((a) => toSegment(a, targetLang)),
    breaking: breakingArticles.slice(0, 3).map((a) => toSegment(a, targetLang)),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = (searchParams.get("lang") || "hi") === "en" ? "en" : "hi";
    const feed = await getCachedGeneratedHomepageFeed();
    if (!feed) {
      return NextResponse.json({ queue: [], breaking: [] });
    }

    const allArticles = [
      ...feed.breakingTicker,
      ...feed.liveWire,
      ...(feed.editorsPicks ? [feed.editorsPicks.lead, ...feed.editorsPicks.supporting] : []),
      ...feed.regionalHighlights,
      ...feed.trending,
    ];

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = allArticles.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    const result = rankSegments(unique, lang);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json({ queue: [], breaking: [] }, { status: 500 });
  }
}
