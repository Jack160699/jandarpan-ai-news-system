import { NextRequest, NextResponse } from "next/server";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { resolveLiveArticlePool } from "@/lib/news/live-feed";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { HomeArticle } from "@/lib/homepage/types";
import type { BroadcastSegment } from "@/features/jd-live/types";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";
import { generateAnchorSpokenScript } from "@/lib/broadcast/anchor-script-engine";
import { detectSemanticTopic } from "@/lib/news/images/editorial-visual-fallbacks";
import { getCategoryVisualTemplate } from "@/lib/news/ai/editorial-image-brand";
import { EDITORIAL_IMAGES } from "@/lib/editorial-images";
import { optimizeCdnImageUrl } from "@/lib/news/images/responsive-sizes";
import { isRejectedImageUrl } from "@/lib/news/images/validate";

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
  summary: string;
  articleBody?: string;
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
  const candidates: Array<string | null | undefined> = [
    primary,
    meta?.media_source_url,
    meta?.hero_media?.media_url,
    meta?.hero_media?.source_url,
    meta?.hero_media?.thumbnail_url,
    meta?.source_attribution?.[0]?.image_url,
    meta?.source_attribution?.[0]?.source_image,
    meta?.embedded_video?.[0]?.thumbnailUrl,
    meta?.embedded_video?.[0]?.thumbnail_url,
    row?.media_records?.[0]?.media_url,
    row?.media_records?.[0]?.source_url,
    row?.media_records?.[0]?.thumbnail_url,
    row?.source_image,
    row?.thumbnail_url,
    row?.hero_image_url,
    meta?.image?.hero_url,
    meta?.image?.sourceUrl,
    meta?.image?.og_url,
    row?.image_url,
    row?.og_image_url,
  ];

  // 1. First pass: genuine non-stock real news photo
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim()) {
      let u = c.trim();
      if (u.startsWith("http://")) u = u.replace(/^http:\/\//i, "https://");
      if (!isStockOrGenericMediaUrl(u)) {
        return u;
      }
    }
  }

  // 2. Second pass: fallback if no genuine news photo found
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim()) {
      let u = c.trim();
      if (u.startsWith("http://")) u = u.replace(/^http:\/\//i, "https://");
      if (!u.includes("placeholder") && !u.startsWith("data:") && !u.includes("J6_coFbogxh")) {
        return u;
      }
    }
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

  return {
    id: a.id,
    slug: a.slug,
    headline: a.headline,
    summary: a.summary || "",
    articleBody: a.summary || "",
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

  return {
    id: r.id,
    slug: r.slug,
    headline: r.headline,
    summary: r.summary || "",
    articleBody: r.article_body || r.summary || "",
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

  const headline = targetLang === "hi" ? (isDevanagari ? c.headline : c.headline) : c.headline;
  const summary = targetLang === "hi" ? (isDevanagari ? c.summary : c.summary) : c.summary;

  // Clean visible district vs statewide label — Never substitute "Chhattisgarh" for a district
  const locationHi = districtRes.nameHi || (districtRes.isStatewide ? "राज्य डेस्क" : catHi);
  const locationEn = districtRes.nameEn || (districtRes.isStatewide ? "State Desk" : catEn);
  const location = targetLang === "hi" ? locationHi : locationEn;

  // Build natural broadcast anchor script immediately (no numbering, full story content)
  const scriptData = generateAnchorSpokenScript({
    headline,
    summary,
    articleBody: c.articleBody,
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

  // Only fall back to contextual/generated visual if no usable real article image exists
  const isBannedOrBroken =
    !finalImageUrl ||
    finalImageUrl.includes("photo-1529107386315-e1a269ed48e0") ||
    finalImageUrl.includes("photo-1449824913935-59a10b8d2000") ||
    finalImageUrl.includes("via.placeholder.com") ||
    finalImageUrl.includes("default.jpg") ||
    finalImageUrl.includes("J6_coFbogxh") ||
    finalImageUrl.startsWith("data:");

  if (isBannedOrBroken) {
    const text = `${c.headline || ""} ${c.summary || ""}`;
    const topic = detectSemanticTopic(c.section, text);
    if (topic) {
      const template = getCategoryVisualTemplate(topic);
      if (template && EDITORIAL_IMAGES[template.fallbackKey]) {
        finalImageUrl = optimizeCdnImageUrl(EDITORIAL_IMAGES[template.fallbackKey], 1200);
      }
    }
    if (!finalImageUrl || isBannedOrBroken) {
      if (districtRes.districtSlug === "bastar") {
        finalImageUrl = optimizeCdnImageUrl(EDITORIAL_IMAGES.folkCulture, 1200);
      } else if (districtRes.districtSlug === "durg" || districtRes.districtSlug === "bhilai") {
        finalImageUrl = optimizeCdnImageUrl(EDITORIAL_IMAGES.steelIndustry, 1200);
      } else if (districtRes.districtSlug === "bilaspur") {
        finalImageUrl = optimizeCdnImageUrl(EDITORIAL_IMAGES.legalCrime, 1200);
      } else {
        finalImageUrl = optimizeCdnImageUrl(EDITORIAL_IMAGES.civicOffice, 1200);
      }
    }
  }

  return {
    id: c.id,
    slug: c.slug,
    headline: c.headline,
    headlineHi: isDevanagari ? c.headline : undefined,
    summary: c.summary,
    summaryHi: isDevanagari ? c.summary : undefined,
    script: scriptData.script,
    durationSec: scriptData.durationSec,
    imageUrl: finalImageUrl,
    categoryLabel: targetLang === "hi" ? catHi : catEn,
    categoryLabelHi: catHi,
    district: location,
    districtHi: locationHi,
    section: c.section,
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

    // Also pull from resolveLiveArticlePool (up to 120 live articles)
    try {
      const { rows } = await resolveLiveArticlePool(120, { select: "homepage" });
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

    // Pull directly from database table generated_articles
    try {
      const dbArticles = await fetchGeneratedArticlePool(120, { select: "homepage" });
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

    // 2. Strict 48-Hour Filtering: published_at >= now - 48 hours
    const now = Date.now();
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
    const cutoff = now - FORTY_EIGHT_HOURS_MS;

    const isDevanagari = (str: string) => /[\u0900-\u097F]/.test(str || "");

    // Filter strictly by Language, 48-Hour validity, and CHHATTISGARH RELEVANCE
    let pool = candidates.filter((c) => {
      // Must have valid headline and slug
      if (!c.headline || !c.slug) return false;

      // HARD RULE: Only Chhattisgarh-relevant stories
      if (!isChhattisgarhOnlyStory(c)) return false;

      // Language check
      const hasDev = isDevanagari(c.headline);
      const langMatches = lang === "hi" ? (hasDev || c.language === "hi") : (!hasDev || c.language === "en");
      if (!langMatches) return false;

      // 48-hour timestamp check (grace up to 72 hours for continuous weekend coverage)
      const pubTime = new Date(c.publishedAt).getTime();
      if (!isNaN(pubTime)) {
        return pubTime >= (now - 72 * 3600 * 1000) && pubTime <= now + 2 * 3600 * 1000;
      }
      return true;
    });

    // Fallback: If filtered pool is small, take all valid Chhattisgarh candidates so news stream is continuous
    if (pool.length < 25) {
      pool = candidates.filter((c) => {
        if (!c.headline || !c.slug) return false;
        if (!isChhattisgarhOnlyStory(c)) return false;
        const hasDev = isDevanagari(c.headline);
        return lang === "hi" ? (hasDev || c.language === "hi") : (!hasDev || c.language === "en");
      });
    }

    // 3. Separate Breaking Stories (only Chhattisgarh breaking)
    const breakingCandidates = pool.filter((c) => c.isBreaking);
    const nonBreakingCandidates = pool.filter((c) => !c.isBreaking);

    // 4. Priority Tiers for Chhattisgarh-only newsroom:
    //  Tier 1: CG local districts (Durg, Bhilai, Raipur, Rajnandgaon, Bilaspur, Korba, Bastar, Surguja, etc.)
    //  Tier 2: CG state news
    //  NO generic India or world stories allowed in Jan Darpan!
    const cgDistrictStories = nonBreakingCandidates.filter((c) =>
      c.districtSlug && CG_DISTRICT_KEYS.has(c.districtSlug)
    );
    const cgStateStories = nonBreakingCandidates.filter((c) =>
      !cgDistrictStories.includes(c)
    );

    // 5. Session Rotation Seed:
    // Shuffle/rotate within tiers deterministically per session seed so different visitors get varied orders
    const sortBySeedAndScore = (arr: BroadcastCandidate[]) => {
      return arr.sort((a, b) => {
        const scoreDiff = (b.priorityScore ?? 50) - (a.priorityScore ?? 50);
        if (Math.abs(scoreDiff) >= 30) return scoreDiff;
        const randA = getPseudoRandom(seed, a.id.charCodeAt(0) || 0);
        const randB = getPseudoRandom(seed, b.id.charCodeAt(0) || 0);
        return randB - randA;
      });
    };

    const orderedRegular = [
      ...sortBySeedAndScore(cgDistrictStories),
      ...sortBySeedAndScore(cgStateStories),
    ];

    // 6. Handle Exclusions (Unseen stories first, then played stories)
    const unseen = orderedRegular.filter((c) => !excludeIds.has(c.id));
    const seen = orderedRegular.filter((c) => excludeIds.has(c.id));

    // If unseen pool has stories, place unseen first, followed by seen for smooth continuous loop
    const finalQueue = unseen.length >= 3 ? [...unseen, ...seen] : orderedRegular;

    return NextResponse.json({
      meta: {
        feedCount: candidates.length,
        eligibleCount: pool.length,
        rejectedCount: candidates.length - pool.length,
        dedupeCount: finalQueue.length,
        queueCount: finalQueue.length,
        breakingCount: breakingCandidates.length,
      },
      queue: finalQueue.map((c) => toSegment(c, lang)),
      breaking: breakingCandidates.slice(0, 3).map((c) => toSegment(c, lang)),
    }, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json({ queue: [], breaking: [] }, { status: 500 });
  }
}
