import { NextRequest, NextResponse } from "next/server";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { resolveLiveArticlePool } from "@/lib/news/live-feed";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { HomeArticle } from "@/lib/homepage/types";
import type { BroadcastSegment } from "@/features/jd-live/types";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";
import { generateAnchorSpokenScript, normalizeHeadlineForSpokenScript } from "@/lib/broadcast/anchor-script-engine";
import { getStaticFallbackArticlePool } from "@/lib/news/fallback/wire-articles";
import { optimizeCdnImageUrl } from "@/lib/news/images/responsive-sizes";
import { hasVerifiedRealMedia, isCleanRightsEligibleMedia, extractVerifiedRealMediaUrl } from "@/lib/news/images/validate";
import { resolveCanonicalCategories } from "@/lib/editorial/canonical-categories";
import { isWithinCanonicalReaderWindow } from "@/lib/news/canonical-window";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CG_SECTIONS = new Set(["chhattisgarh", "raipur"]);

const CG_DISTRICT_KEYS = new Set([
  "durg",
  "bhilai",
  "raipur",
  "rajnandgaon",
  "bilaspur",
  "korba",
  "raigarh",
  "bastar",
  "surguja",
  "jagdalpur",
  "ambikapur",
  "dhamtari",
  "mahasamund",
  "kanker",
  "sukma",
  "dantewada",
  "bijapur",
  "narayanpur",
  "kondagaon",
  "kabirdham",
  "balod",
  "bemetara",
  "gariaband",
  "balodabazar",
  "janjgir",
  "champa",
  "jashpur",
  "korea",
  "manendragarh",
  "mohla",
  "sakti",
  "sarangarh",
  "khairagarh",
]);

const DISTRICT_NAMES_HI: Record<string, string> = {
  raipur: "रायपुर",
  durg: "दुर्ग",
  bhilai: "भिलाई",
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

/** Deterministic pseudo-random number for session-based ordering */
function getPseudoRandom(seedStr: string, index: number): number {
  let hash = 0;
  const combined = `${seedStr}_${index}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

/** Detect district name from text */
function detectDistrict(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("दुर्ग") || t.includes("durg")) return "durg";
  if (t.includes("भिलाई") || t.includes("bhilai")) return "bhilai";
  if (t.includes("रायपुर") || t.includes("raipur")) return "raipur";
  if (t.includes("बिलासपुर") || t.includes("bilaspur")) return "bilaspur";
  if (t.includes("बस्तर") || t.includes("bastar") || t.includes("जगदलपुर") || t.includes("jagdalpur")) return "bastar";
  if (t.includes("कोरबा") || t.includes("korba")) return "korba";
  if (t.includes("राजनंदगांव") || t.includes("rajnandgaon")) return "rajnandgaon";
  if (t.includes("रायगढ़") || t.includes("raigarh")) return "raigarh";
  if (t.includes("अंबिकापुर") || t.includes("ambikapur") || t.includes("सरगुजा") || t.includes("surguja")) return "surguja";
  if (t.includes("दंतेवाड़ा") || t.includes("dantewada")) return "dantewada";
  if (t.includes("कांकेर") || t.includes("kanker")) return "kanker";
  if (t.includes("सुकमा") || t.includes("sukma")) return "sukma";
  if (t.includes("बीजापुर") || t.includes("bijapur")) return "bijapur";
  if (t.includes("धमतरी") || t.includes("dhamtari")) return "dhamtari";
  if (t.includes("महासमुंद") || t.includes("mahasamund")) return "mahasamund";
  if (t.includes("कबीरधाम") || t.includes("kabirdham") || t.includes("कवर्धा") || t.includes("kawardha")) return "kabirdham";
  if (t.includes("बालोद") || t.includes("balod")) return "balod";
  if (t.includes("बेमेतरा") || t.includes("bemetara")) return "bemetara";
  if (t.includes("गरियाबंद") || t.includes("gariaband")) return "gariaband";
  if (t.includes("बलौदाबाजार") || t.includes("बलौदाबाज़ार") || t.includes("balodabazar")) return "balodabazar";
  if (t.includes("जांजगीर") || t.includes("चांपा") || t.includes("janjgir")) return "janjgir";
  if (t.includes("जशपुर") || t.includes("jashpur")) return "jashpur";
  if (t.includes("कोरिया") || t.includes("korea")) return "korea";
  if (t.includes("मनेंद्रगढ़") || t.includes("manendragarh")) return "manendragarh";
  if (t.includes("मोहला") || t.includes("mohla")) return "mohla";
  if (t.includes("सक्ती") || t.includes("sakti")) return "sakti";
  if (t.includes("सारंगढ़") || t.includes("sarangarh")) return "sarangarh";
  if (t.includes("खैरागढ़") || t.includes("khairagarh")) return "khairagarh";
  if (t.includes("पेंड्रा") || t.includes("pendra") || t.includes("गौरेला") || t.includes("gaurela")) return "pendra";
  return null;
}

const CG_TEXT_SIGNALS = [
  "छत्तीसगढ़", "chhattisgarh", "chattisgarh",
  "रायपुर", "raipur", "दुर्ग", "durg", "भिलाई", "bhilai",
  "बिलासपुर", "bilaspur", "बस्तर", "bastar", "कोरबा", "korba",
  "राजनंदगांव", "rajnandgaon", "रायगढ़", "raigarh", "अंबिकापुर", "ambikapur",
  "जगदलपुर", "jagdalpur", "कांकेर", "kanker", "दंतेवाड़ा", "dantewada",
  "सुकमा", "sukma", "बीजापुर", "bijapur", "धमतरी", "dhamtari",
  "महासमुंद", "mahasamund", "कबीरधाम", "kabirdham", "कवर्धा", "kawardha",
  "बालोद", "balod", "बेमेतरा", "bemetara", "गरियाबंद", "gariaband",
  "बलौदाबाजार", "balodabazar", "जांजगीर", "janjgir", "चांपा", "champa",
  "सरगुजा", "surguja", "जशपुर", "jashpur", "कोरिया", "korea",
  "मनेंद्रगढ़", "manendragarh", "मोहला", "mohla", "सक्ती", "sakti",
  "सारंगढ़", "sarangarh", "खैरागढ़", "khairagarh", "पेंड्रा", "pendra",
  "गौरेला", "gaurela", "विष्णु देव साय", "विष्णुदेव साय", "साय कैबिनेट",
  "महानदी", "इंद्रावती", "हसदेव", "भिलाई स्टील", "bsp", "secl", "nmdc", "cspdcl"
];

// Negative filters: purely outside states or generic national topics with no Chhattisgarh connection
const EXCLUDE_SIGNALS = [
  "मध्य प्रदेश", "madhya pradesh",
  "पश्चिम बंगाल", "west bengal", "बंगाल में",
  "जम्मू-कश्मीर", "jammu", "kashmir",
  "महाराष्ट्र", "maharashtra", "iit बॉम्बे", "iit bombay",
  "उत्तर प्रदेश", "uttar pradesh",
  "बिहार", "bihar",
  "राजस्थान", "rajasthan",
  "गुजरात", "gujarat",
  "पंजाब", "punjab",
  "हरियाणा", "haryana",
  "तमिलनाडु", "tamil nadu",
  "केरल", "kerala",
  "कर्नाटक", "karnataka",
  "झारखंड", "jharkhand",
  "देश-दुनिया", "राशिफल", "अंक ज्योतिष", "नाखून टूटने",
  "खाद्य तेल सस्ता होने का अनुमान"
];

function isChhattisgarhOnlyStory(c: BroadcastCandidate): boolean {
  const text = `${c.headline} ${c.summary}`.toLowerCase();
  const hlLower = c.headline.toLowerCase();

  // Disallow generic national roundups or astrology
  if (hlLower.includes("देश-दुनिया") || hlLower.includes("राशिफल") || hlLower.includes("अंक ज्योतिष")) {
    return false;
  }

  // Purely outside states with no CG relevance
  if (
    (text.includes("पश्चिम बंगाल") || text.includes("जम्मू-कश्मीर") || text.includes("पंजाब") || text.includes("केरल") || text.includes("तमिलनाडु")) &&
    !text.includes("छत्तीसगढ़") && !text.includes("chhattisgarh") && !c.districtSlug
  ) {
    return false;
  }

  // Jan Darpan articles are Chhattisgarh regional coverage by default if section or tags indicate it
  const isCgSection = c.section === "chhattisgarh" || c.section === "raipur" || c.tags?.includes("chhattisgarh");
  const hasCgMention =
    CG_TEXT_SIGNALS.some((sig) => text.includes(sig.toLowerCase())) ||
    (c.districtSlug && CG_DISTRICT_KEYS.has(c.districtSlug)) ||
    isCgSection;

  return Boolean(hasCgMention);
}

/** Standard story item for broadcast ranking */
type BroadcastCandidate = {
  id: string;
  slug: string;
  headline: string;
  headlineHi?: string;
  headlineEn?: string;
  summary: string;
  summaryHi?: string;
  summaryEn?: string;
  articleBody?: string;
  articleBodyHi?: string;
  articleBodyEn?: string;
  imageUrl: string;
  section: string;
  language: string;
  tags: string[];
  publishedAt: string;
  isBreaking: boolean;
  priorityScore: number;
  districtSlug: string | null;
};

function isStockOrGenericMediaUrl(url?: string | null): boolean {
  if (!url) return true;
  const l = url.toLowerCase();
  return (
    l.includes("images.unsplash.com") ||
    l.includes("plus.unsplash.com") ||
    l.includes("source.unsplash.com") ||
    l.includes("pexels.com") ||
    l.includes("pixabay.com") ||
    l.includes("googleusercontent.com/j6_cofbogxh") ||
    l.includes("photo-1529107386315") ||
    l.includes("photo-1449824913935") ||
    l.includes("via.placeholder.com") ||
    l.includes("default.jpg") ||
    l.startsWith("data:")
  );
}

function resolveCandidateMediaUrl(
  primary?: string | null,
  meta?: any,
  row?: any
): string {
  const verified = extractVerifiedRealMediaUrl({
    hero_image_url: primary,
    editorial_metadata: meta,
    ...row,
  });
  if (verified && hasVerifiedRealMedia(verified)) {
    return verified;
  }
  return "";
}

function normalizeHomeArticle(a: HomeArticle): BroadcastCandidate {
  const districtRes = resolveCanonicalStoryDistrict({
    explicitDistrict: a.districtSlug || a.district,
    tags: a.tags,
    headline: a.headline,
    summary: a.summary,
    section: a.section,
    categoryLabel: a.categoryLabel,
  });

  const rawImg = resolveCandidateMediaUrl(
    a.imageUrl || a.ogImageUrl,
    (a as any).editorial_metadata,
    a
  );

  const rawMeta = (a as any).editorial_metadata;
  const translations = (a as any).translations || rawMeta?.translations || {};
  const enTrans = translations.en;
  const hiTrans = translations.hi;
  const isDevanagari = /[\u0900-\u097F]/.test(a.headline || "");

  return {
    id: a.id,
    slug: a.slug,
    headline: a.headline,
    headlineHi: hiTrans?.headline || (isDevanagari ? a.headline : undefined),
    headlineEn: enTrans?.headline || (!isDevanagari ? a.headline : undefined),
    summary: a.summary || "",
    summaryHi: hiTrans?.summary || (isDevanagari ? a.summary : undefined),
    summaryEn: enTrans?.summary || (!isDevanagari ? a.summary : undefined),
    articleBody: a.summary || "",
    articleBodyHi: hiTrans?.article_body || a.summary || "",
    articleBodyEn: enTrans?.article_body || a.summary || "",
    imageUrl: rawImg,
    section: a.section || "chhattisgarh",
    language: a.language || "hi",
    tags: a.tags || [],
    publishedAt: a.publishedAt,
    isBreaking: !!(a.ranking?.isBreaking),
    priorityScore: a.priorityScore ?? a.trendScore ?? 50,
    districtSlug: districtRes.districtSlug,
  };
}

function normalizeGeneratedRow(r: GeneratedArticleRow): BroadcastCandidate {
  const isBreaking = !!(
    r.editorial_metadata &&
    typeof r.editorial_metadata === "object" &&
    "is_breaking" in r.editorial_metadata &&
    r.editorial_metadata.is_breaking
  );
  const sectionTag = r.tags?.find((t) => ["chhattisgarh", "raipur", "india", "world", "business", "sports", "politics"].includes(t)) || "chhattisgarh";

  const districtRes = resolveCanonicalStoryDistrict({
    geo_metadata: r.geo_metadata,
    tags: r.tags,
    headline: r.headline,
    summary: r.summary,
    body: r.article_body,
    section: sectionTag,
  });

  const rawImg = resolveCandidateMediaUrl(
    r.hero_image_url,
    r.editorial_metadata,
    r
  );

  const rawMeta = r.editorial_metadata as any;
  const translations = (r.translations as any) || rawMeta?.translations || {};
  const enTrans = translations.en;
  const hiTrans = translations.hi;
  const isDevanagari = /[\u0900-\u097F]/.test(r.headline || "");

  return {
    id: r.id,
    slug: r.slug,
    headline: r.headline,
    headlineHi: hiTrans?.headline || (isDevanagari ? r.headline : undefined),
    headlineEn: enTrans?.headline || (!isDevanagari ? r.headline : undefined),
    summary: r.summary || "",
    summaryHi: hiTrans?.summary || (isDevanagari ? r.summary : undefined),
    summaryEn: enTrans?.summary || (!isDevanagari ? r.summary : undefined),
    articleBody: r.article_body || r.summary || "",
    articleBodyHi: hiTrans?.article_body || r.article_body || r.summary || "",
    articleBodyEn: enTrans?.article_body || r.article_body || r.summary || "",
    imageUrl: rawImg,
    section: sectionTag,
    language: r.language || "hi",
    tags: r.tags || [],
    publishedAt: r.published_at || r.created_at,
    isBreaking,
    priorityScore: r.homepage_pin ? 90 : isBreaking ? 95 : 50,
    districtSlug: districtRes.districtSlug,
  };
}

/** Map candidate → BroadcastSegment */
function toSegment(c: BroadcastCandidate, targetLang: "hi" | "en"): BroadcastSegment {
  const isDevanagari = /[\u0900-\u097F]/.test(c.headline || "");
  const districtRes = resolveCanonicalStoryDistrict({
    explicitDistrict: c.districtSlug,
    tags: c.tags,
    headline: c.headline,
    summary: c.summary,
    body: c.articleBody,
    section: c.section,
  });

  const catHi = SECTION_NAMES_HI[c.section] || "राज्य डेस्क";
  const catEn = SECTION_NAMES_EN[c.section] || "State Desk";

  const rawHeadlineHi = c.headlineHi || (isDevanagari ? c.headline : c.headline);
  const rawHeadlineEn = c.headlineEn || (!isDevanagari ? c.headline : c.headline);
  const headlineHi = normalizeHeadlineForSpokenScript(rawHeadlineHi, c.summaryHi || c.summary, c.articleBodyHi || c.articleBody);
  const headlineEn = normalizeHeadlineForSpokenScript(rawHeadlineEn, c.summaryEn || c.summary, c.articleBodyEn || c.articleBody);
  const headline = targetLang === "en" ? (headlineEn || headlineHi) : (headlineHi || headlineEn);

  const summaryHi = c.summaryHi || (isDevanagari ? c.summary : c.summary);
  const summaryEn = c.summaryEn || (!isDevanagari ? c.summary : c.summary);
  const summary = targetLang === "en" ? (c.summaryEn || c.summary) : (c.summaryHi || c.summary);
  const body = targetLang === "en" ? (c.articleBodyEn || c.articleBody) : (c.articleBodyHi || c.articleBody);

  // Clean visible district vs statewide label — Never substitute "Chhattisgarh" for a district
  const locationHi = districtRes.nameHi || (districtRes.isStatewide ? "राज्य डेस्क" : catHi);
  const locationEn = districtRes.nameEn || (districtRes.isStatewide ? "State Desk" : catEn);
  const location = targetLang === "hi" ? locationHi : locationEn;

  // Build natural broadcast anchor script immediately (Headline once + short overview continuation)
  const scriptData = generateAnchorSpokenScript({
    headline,
    summary,
    articleBody: body,
    district: location,
    section: c.section,
    categoryLabel: targetLang === "hi" ? catHi : catEn,
    isBreaking: c.isBreaking,
    language: targetLang,
  });

  // Priority 1: Real article image (always preserve legitimate news photographs)
  let finalImageUrl = c.imageUrl?.trim() || "";
  if (finalImageUrl.startsWith("http://")) {
    finalImageUrl = finalImageUrl.replace(/^http:\/\//i, "https://");
  }

  const catRes = resolveCanonicalCategories({
    headline: c.headline,
    summary: c.summary,
    body: c.articleBody,
    section: c.section,
    tags: c.tags,
    district: location,
    districtSlug: c.districtSlug,
  });

  return {
    id: c.id,
    slug: c.slug,
    headline,
    headlineHi,
    headlineEn,
    summary,
    summaryHi,
    summaryEn,
    script: scriptData.script,
    durationSec: scriptData.durationSec,
    imageUrl: finalImageUrl,
    categoryLabel: targetLang === "hi" ? catHi : catEn,
    categoryLabelHi: catHi,
    categoryLabelEn: catEn,
    district: location,
    districtHi: locationHi,
    districtEn: locationEn,
    districtSlug: districtRes.districtSlug || c.districtSlug || null,
    section: c.section,
    canonicalCategories: catRes.categories,
    primaryCategory: catRes.primaryCategory,
    isBreaking: c.isBreaking,
    isLive: true,
    priorityScore: c.priorityScore,
    publishedAt: c.publishedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = (searchParams.get("lang") || "hi") === "en" ? "en" : "hi";
    const seed = searchParams.get("seed") || "default_seed";
    const excludeParam = searchParams.get("exclude") || "";
    const excludeIds = new Set(excludeParam.split(",").map((s) => s.trim()).filter(Boolean));

    // 1. Gather articles from both generated homepage feed and live pool
    const candidates: BroadcastCandidate[] = [];
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();

    const feed = await getCachedGeneratedHomepageFeed().catch(() => null);
    if (feed) {
      const feedArticles = [
        ...feed.breakingTicker,
        ...feed.liveWire,
        ...(feed.editorsPicks ? [feed.editorsPicks.lead, ...feed.editorsPicks.supporting] : []),
        ...feed.regionalHighlights,
        ...feed.trending,
      ];
      for (const a of feedArticles) {
        if (!a?.id || !a?.slug || !a?.headline?.trim()) continue;
        if (seenIds.has(a.id) || seenSlugs.has(a.slug)) continue;
        seenIds.add(a.id);
        seenSlugs.add(a.slug);
        candidates.push(normalizeHomeArticle(a));
      }
    }

    // Also pull from resolveLiveArticlePool (up to 300 live articles from last 30 days)
    try {
      const { rows } = await resolveLiveArticlePool(300, { select: "homepage" });
      for (const r of rows) {
        if (!r?.id || !r?.slug || !r?.headline?.trim()) continue;
        if (seenIds.has(r.id) || seenSlugs.has(r.slug)) continue;
        seenIds.add(r.id);
        seenSlugs.add(r.slug);
        candidates.push(normalizeGeneratedRow(r));
      }
    } catch {
      // Live pool query error fallback
    }

    // Pull directly from database table generated_articles (up to 300 articles)
    try {
      const dbArticles = await fetchGeneratedArticlePool(300, { select: "homepage" });
      for (const r of (dbArticles || [])) {
        if (!r?.id || !r?.slug || !r?.headline?.trim()) continue;
        if (seenIds.has(r.id) || seenSlugs.has(r.slug)) continue;
        seenIds.add(r.id);
        seenSlugs.add(r.slug);
        candidates.push(normalizeGeneratedRow(r));
      }
    } catch {
      // DB pool query error fallback
    }

    // Also pull 100% verified real Chhattisgarh static article pool
    try {
      const staticArticles = getStaticFallbackArticlePool();
      for (const r of staticArticles) {
        if (!r?.id || !r?.slug || !r?.headline?.trim()) continue;
        if (seenIds.has(r.id) || seenSlugs.has(r.slug)) continue;
        seenIds.add(r.id);
        seenSlugs.add(r.slug);
        candidates.push(normalizeGeneratedRow(r));
      }
    } catch {
      // Static pool load fallback
    }

    // 2. Strict Media & Rolling 48-Hour Filtering
    const now = Date.now();
    const isDevanagari = (str: string) => /[\u0900-\u097F]/.test(str || "");

    // Filter strictly by Clean Real Media, 30-day validity, and CHHATTISGARH RELEVANCE.
    // Language invariant: Under the same district, category, and date window, Hindi and English
    // MUST contain the exact same canonical articles. Only presentation changes.
    const pool = candidates.filter((c) => {
      // Must have valid headline and slug
      if (!c.headline || !c.slug) return false;

      // ABSOLUTE MEDIA RULE: ONLY SHOW REAL NEWS WITH REAL CLEAN SOURCE MEDIA
      // Hard gate: zero stock photos, zero placeholders, zero AI visuals, zero third-party channel branding
      if (!isCleanRightsEligibleMedia(c.imageUrl)) return false;

      // HARD RULE: Only Chhattisgarh-relevant stories
      if (!isChhattisgarhOnlyStory(c)) return false;

      // Authoritative 30-day visible news window rule:
      // published_at >= now - 30 days
      return isWithinCanonicalReaderWindow(c.publishedAt);
    });

    // 3. Separate Breaking Stories (only Chhattisgarh breaking with verified real media)
    const breakingCandidates = pool.filter((c) => c.isBreaking);
    const nonBreakingCandidates = pool.filter((c) => !c.isBreaking);

    // 4. Chronological ordering: NEWEST ARTICLE FIRST
    // Strictly chronological by original published_at, no seriousness or artificial priority score overrides
    const sortByPublishedAtDesc = (arr: BroadcastCandidate[]) => {
      return [...arr].sort((a, b) => {
        const tA = new Date(a.publishedAt).getTime() || 0;
        const tB = new Date(b.publishedAt).getTime() || 0;
        return tB - tA;
      });
    };

    const orderedRegular = sortByPublishedAtDesc(nonBreakingCandidates);
    const orderedBreaking = sortByPublishedAtDesc(breakingCandidates);

    // 5. Handle Exclusions (Unseen stories first, then played stories)
    const unseen = orderedRegular.filter((c) => !excludeIds.has(c.id));
    const seen = orderedRegular.filter((c) => excludeIds.has(c.id));

    // If unseen pool has stories, place unseen first, followed by seen for smooth continuous loop
    const finalQueue = unseen.length >= 3 ? [...unseen, ...seen] : orderedRegular;

    const finalSegments = finalQueue
      .map((c) => toSegment(c, lang))
      .filter((s) => !!s.imageUrl && !!s.script);

    const breakingSegments = orderedBreaking
      .slice(0, 3)
      .map((c) => toSegment(c, lang))
      .filter((s) => !!s.imageUrl && !!s.script);

    return NextResponse.json({
      meta: {
        feedCount: candidates.length,
        eligibleCount: pool.length,
        rejectedCount: candidates.length - pool.length,
        dedupeCount: finalSegments.length,
        queueCount: finalSegments.length,
        breakingCount: breakingSegments.length,
      },
      queue: finalSegments,
      breaking: breakingSegments,
    }, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json({ queue: [], breaking: [] }, { status: 500 });
  }
}
