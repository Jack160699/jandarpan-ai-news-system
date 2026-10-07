import { NextRequest, NextResponse } from "next/server";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { BroadcastSegment } from "@/features/jd-live/types";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";
import { generateAnchorSpokenScript, normalizeHeadlineForSpokenScript } from "@/lib/broadcast/anchor-script-engine";
import { optimizeCdnImageUrl } from "@/lib/news/images/responsive-sizes";
import { hasVerifiedRealMedia, isCleanRightsEligibleMedia, extractVerifiedRealMediaUrl } from "@/lib/news/images/validate";
import { resolveCanonicalCategories } from "@/lib/editorial/canonical-categories";
import { hasLanguageRepresentation, orderLiveQueue, selectLiveRows } from "@/lib/broadcast/live-selection";

export const dynamic = "force-dynamic";

/** Each row carries translated bodies (~6 KB). 60 = the latest ~half-day of stories; the pool is cached for an hour and shared. */
const BROADCAST_POOL_ROWS = 60;
export const revalidate = 0;

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
    articleBodyHi: hiTrans?.article_body || (isDevanagari ? r.article_body || r.summary : undefined),
    articleBodyEn: enTrans?.article_body || (!isDevanagari ? r.article_body || r.summary : undefined),
    imageUrl: rawImg,
    section: sectionTag,
    language: r.language || (isDevanagari ? "hi" : "en"),
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

  const rawHeadlineHi = c.headlineHi || (isDevanagari ? c.headline : undefined);
  const rawHeadlineEn = c.headlineEn || (!isDevanagari ? c.headline : undefined);
  const headlineHi = rawHeadlineHi
    ? normalizeHeadlineForSpokenScript(rawHeadlineHi, c.summaryHi, c.articleBodyHi)
    : "";
  const headlineEn = rawHeadlineEn
    ? normalizeHeadlineForSpokenScript(rawHeadlineEn, c.summaryEn, c.articleBodyEn)
    : "";

  // Strict language representation — zero cross-language pollution. A missing language is filtered out BEFORE this point
  // (hasLanguageRepresentation); an empty string here means "drop the segment", never a generic placeholder headline.
  const headline = targetLang === "en" ? headlineEn || "" : headlineHi || "";

  const summary = targetLang === "en" ? c.summaryEn || "" : c.summaryHi || "";

  const body =
    targetLang === "en"
      ? (c.articleBodyEn || "")
      : (c.articleBodyHi || "");

  // Clean visible district vs statewide vs national vs international label
  const locationHi =
    districtRes.displayTagHi ||
    districtRes.nameHi ||
    (districtRes.geographicScope === "international"
      ? "विदेश डेस्क"
      : districtRes.geographicScope === "national"
      ? "राष्ट्रीय डेस्क"
      : districtRes.isStatewide
      ? "राज्य डेस्क"
      : catHi);

  const locationEn =
    districtRes.displayTagEn ||
    districtRes.nameEn ||
    (districtRes.geographicScope === "international"
      ? "World Desk"
      : districtRes.geographicScope === "national"
      ? "National Desk"
      : districtRes.isStatewide
      ? "State Desk"
      : catEn);

  const location = targetLang === "hi" ? locationHi : locationEn;

  // Build natural broadcast anchor script strictly in target language
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
    headlineHi: headlineHi || c.headlineHi || (isDevanagari ? c.headline : ""),
    headlineEn: headlineEn || c.headlineEn || (!isDevanagari ? c.headline : ""),
    summary,
    summaryHi: c.summaryHi || (isDevanagari ? c.summary : ""),
    summaryEn: c.summaryEn || (!isDevanagari ? c.summary : ""),
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
    locality: districtRes.localityEn,
    localityHi: districtRes.localityHi,
    localityEn: districtRes.localityEn,
    geographicScope: districtRes.geographicScope,
    displayTagHi: districtRes.displayTagHi,
    displayTagEn: districtRes.displayTagEn,
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
    const userId = searchParams.get("userId");

    // 1. One source: the published pool (60 newest rows with translated bodies; cached and shared). The homepage feed and the
    //    wire/static layers are NOT merged in -- they were a second, ungated path to the same stories.
    const dbArticles = await fetchGeneratedArticlePool(BROADCAST_POOL_ROWS, { select: "homepage_bodies" }).catch(() => []);

    // 2. Same eligibility and geography policy as /latest, newest first (public gate, 30-day window, scope, de-dup).
    const selection = selectLiveRows(dbArticles);
    const candidates: BroadcastCandidate[] = selection.rows
      .filter((r) => r?.id && r?.slug && r?.headline?.trim())
      .map((r) => normalizeGeneratedRow(r));

    // 3. Live-only rules (documented in live-selection.ts): verified rights-clean media, and the requested language must exist.
    const pool = candidates.filter((c) => isCleanRightsEligibleMedia(c.imageUrl) && hasLanguageRepresentation(c, lang));

    // Played-story exclusion applies to CONTINUATION requests only, so a fresh session always starts with the newest story.
    const continuation = excludeIds.size > 0;
    if (userId && continuation) {
      try {
        const { createAdminServerClient } = await import("@/lib/supabase/admin");
        const supabase = createAdminServerClient();
        const { data: batch } = await (supabase as any).rpc("get_user_consumption_batch", {
          p_user_id: userId,
          p_story_ids: pool.map((c) => c.id),
        });
        if (batch && typeof batch === "object") {
          for (const [sId, rec] of Object.entries(batch as Record<string, any>)) {
            if (rec?.consumed) excludeIds.add(sId);
          }
        }
      } catch {}
    }

    // 4. Breaking stories travel in their own channel and are not repeated in the regular queue.
    const orderedRegular = orderLiveQueue(pool.filter((c) => !c.isBreaking), { playedIds: excludeIds, continuation });
    const orderedBreaking = orderLiveQueue(pool.filter((c) => c.isBreaking));

    const finalSegments = orderedRegular
      .map((c) => toSegment(c, lang))
      .filter((s) => !!s.imageUrl && !!s.script && !!s.headline);

    const breakingSegments = orderedBreaking
      .slice(0, 3)
      .map((c) => toSegment(c, lang))
      .filter((s) => !!s.imageUrl && !!s.script && !!s.headline);

    return NextResponse.json({
      meta: {
        feedCount: dbArticles.length,
        newestEligibleId: orderedRegular[0]?.id ?? orderedBreaking[0]?.id ?? null,
        droppedByGate: selection.diagnostics.droppedByGate,
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
