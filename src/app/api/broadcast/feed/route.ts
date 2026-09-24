import { NextRequest, NextResponse } from "next/server";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { resolveLiveArticlePool } from "@/lib/news/live-feed";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { HomeArticle } from "@/lib/homepage/types";
import type { BroadcastSegment } from "@/features/jd-live/types";

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

/** Standard story item for broadcast ranking */
type BroadcastCandidate = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  imageUrl: string;
  section: string;
  language: string;
  tags: string[];
  publishedAt: string;
  isBreaking: boolean;
  priorityScore: number;
  districtSlug: string | null;
};

function normalizeHomeArticle(a: HomeArticle): BroadcastCandidate {
  const districtTag = a.tags?.find((t) => t.startsWith("district:"))?.replace("district:", "")?.toLowerCase() || null;
  return {
    id: a.id,
    slug: a.slug,
    headline: a.headline,
    summary: a.summary || "",
    imageUrl: a.imageUrl || a.ogImageUrl || "",
    section: a.section || "chhattisgarh",
    language: a.language || "hi",
    tags: a.tags || [],
    publishedAt: a.publishedAt,
    isBreaking: !!(a.ranking?.isBreaking),
    priorityScore: a.priorityScore ?? a.trendScore ?? 50,
    districtSlug: districtTag,
  };
}

function normalizeGeneratedRow(r: GeneratedArticleRow): BroadcastCandidate {
  const districtTag = r.tags?.find((t) => t.startsWith("district:"))?.replace("district:", "")?.toLowerCase() || null;
  const sectionTag = r.tags?.find((t) => ["chhattisgarh", "raipur", "india", "world", "business", "sports", "politics"].includes(t)) || "chhattisgarh";
  const isBreaking = !!(
    r.editorial_metadata &&
    typeof r.editorial_metadata === "object" &&
    "is_breaking" in r.editorial_metadata &&
    r.editorial_metadata.is_breaking
  );

  return {
    id: r.id,
    slug: r.slug,
    headline: r.headline,
    summary: r.summary || "",
    imageUrl: r.hero_image_url || "",
    section: sectionTag,
    language: r.language || "hi",
    tags: r.tags || [],
    publishedAt: r.published_at || r.created_at,
    isBreaking,
    priorityScore: r.homepage_pin ? 90 : isBreaking ? 95 : 50,
    districtSlug: districtTag,
  };
}

/** Map candidate → BroadcastSegment */
function toSegment(c: BroadcastCandidate, targetLang: "hi" | "en"): BroadcastSegment {
  const isDevanagari = /[\u0900-\u097F]/.test(c.headline || "");
  const districtSlug = c.districtSlug;
  const districtHi = districtSlug ? (DISTRICT_NAMES_HI[districtSlug] || "छत्तीसगढ़") : "छत्तीसगढ़";
  const districtEn = districtSlug ? (districtSlug.charAt(0).toUpperCase() + districtSlug.slice(1)) : "Chhattisgarh";

  const catHi = SECTION_NAMES_HI[c.section] || "राज्य डेस्क";
  const catEn = SECTION_NAMES_EN[c.section] || "State Desk";

  return {
    id: c.id,
    slug: c.slug,
    headline: c.headline,
    headlineHi: isDevanagari ? c.headline : undefined,
    summary: c.summary,
    summaryHi: isDevanagari ? c.summary : undefined,
    imageUrl: c.imageUrl,
    categoryLabel: targetLang === "hi" ? catHi : catEn,
    categoryLabelHi: catHi,
    district: targetLang === "hi" ? districtHi : districtEn,
    districtHi,
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

    // 2. Strict 48-Hour Filtering: published_at >= now - 48 hours
    const now = Date.now();
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
    const cutoff = now - FORTY_EIGHT_HOURS_MS;

    const isDevanagari = (str: string) => /[\u0900-\u097F]/.test(str || "");

    // Filter by Language & 48-Hour validity
    let pool = candidates.filter((c) => {
      // Must have valid headline and slug
      if (!c.headline || !c.slug) return false;

      // Language check
      const hasDev = isDevanagari(c.headline);
      const langMatches = lang === "hi" ? (hasDev || c.language === "hi") : (!hasDev || c.language === "en");
      if (!langMatches) return false;

      // 48-hour timestamp check
      const pubTime = new Date(c.publishedAt).getTime();
      if (!isNaN(pubTime)) {
        // Within 48 hours and not > 2 hours in the future
        return pubTime >= cutoff && pubTime <= now + 2 * 3600 * 1000;
      }
      return false;
    });

    // Fallback: If 48-hour strictly filtered pool is small, take the newest candidates for this language
    if (pool.length < 5) {
      pool = candidates.filter((c) => {
        const hasDev = isDevanagari(c.headline);
        return lang === "hi" ? (hasDev || c.language === "hi") : (!hasDev || c.language === "en");
      });
    }

    // 3. Separate Breaking Stories
    const breakingCandidates = pool.filter((c) => c.isBreaking);
    const nonBreakingCandidates = pool.filter((c) => !c.isBreaking);

    // 4. Priority Tiers for Chhattisgarh-first newsroom:
    //  Tier 1: CG local districts (Durg, Bhilai, Raipur, Rajnandgaon, Bilaspur, Korba, Bastar, etc.)
    //  Tier 2: CG state news
    //  Tier 3: National India
    //  Tier 4: World / other
    const cgDistrictStories = nonBreakingCandidates.filter((c) =>
      c.districtSlug && CG_DISTRICT_KEYS.has(c.districtSlug)
    );
    const cgStateStories = nonBreakingCandidates.filter((c) =>
      !cgDistrictStories.includes(c) && CG_SECTIONS.has(c.section)
    );
    const indiaStories = nonBreakingCandidates.filter((c) =>
      !cgDistrictStories.includes(c) && !cgStateStories.includes(c) && c.section === "india"
    );
    const worldStories = nonBreakingCandidates.filter((c) =>
      !cgDistrictStories.includes(c) && !cgStateStories.includes(c) && c.section !== "india"
    );

    // 5. Session Rotation Seed:
    // Shuffle/rotate within tiers deterministically per session seed so different visitors get varied orders
    const sortBySeedAndScore = (arr: BroadcastCandidate[]) => {
      return arr.sort((a, b) => {
        // High priority scores stay ahead
        const scoreDiff = (b.priorityScore ?? 50) - (a.priorityScore ?? 50);
        if (Math.abs(scoreDiff) >= 30) return scoreDiff;
        // Deterministic session variation for stories with similar priority
        const randA = getPseudoRandom(seed, a.id.charCodeAt(0) || 0);
        const randB = getPseudoRandom(seed, b.id.charCodeAt(0) || 0);
        return randB - randA;
      });
    };

    const orderedRegular = [
      ...sortBySeedAndScore(cgDistrictStories),
      ...sortBySeedAndScore(cgStateStories),
      ...sortBySeedAndScore(indiaStories),
      ...sortBySeedAndScore(worldStories),
    ];

    // 6. Handle Exclusions (Unseen stories first, then played stories)
    const unseen = orderedRegular.filter((c) => !excludeIds.has(c.id));
    const seen = orderedRegular.filter((c) => excludeIds.has(c.id));

    // If unseen pool has stories, place unseen first, followed by seen
    const finalQueue = unseen.length >= 3 ? [...unseen, ...seen] : orderedRegular;

    return NextResponse.json({
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
