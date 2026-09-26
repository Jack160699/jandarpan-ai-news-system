import { NextRequest, NextResponse } from "next/server";
import { computeArchiveHealthBreakdown } from "@/lib/news/canonical-window";
import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { getStaticFallbackArticlePool } from "@/lib/news/fallback/wire-articles";
import { CANONICAL_CATEGORIES, matchesCanonicalCategory } from "@/features/jd-live/lib/categories";
import { hasVerifiedRealMedia, isCleanRightsEligibleMedia } from "@/lib/news/images/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const now = new Date();

    // 1. Fetch live broadcast pool segments from internal endpoint
    const host = req.headers.get("host") || "www.jandarpan.news";
    const proto = host.includes("localhost") ? "http" : "https";
    const feedUrlHi = `${proto}://${host}/api/broadcast/feed?lang=hi`;
    const feedUrlEn = `${proto}://${host}/api/broadcast/feed?lang=en`;

    const [resHi, resEn] = await Promise.all([
      fetch(feedUrlHi, { cache: "no-store" }).catch(() => null),
      fetch(feedUrlEn, { cache: "no-store" }).catch(() => null),
    ]);

    const dataHi = resHi?.ok ? await resHi.json() : null;
    const dataEn = resEn?.ok ? await resEn.json() : null;

    const queueHi = dataHi?.queue || [];
    const queueEn = dataEn?.queue || [];

    // Language Parity verification
    const hiIds = new Set(queueHi.map((s: any) => s.id));
    const enIds = new Set(queueEn.map((s: any) => s.id));
    const parityMatch =
      hiIds.size === enIds.size && [...hiIds].every((id) => enIds.has(id));

    // Archive Health Breakdown
    const health = computeArchiveHealthBreakdown(queueHi, now);

    // Media Quality Audit
    const mediaValidCount = queueHi.filter((s: any) =>
      isCleanRightsEligibleMedia(s.imageUrl) && hasVerifiedRealMedia(s.imageUrl)
    ).length;

    // Canonical Category Distribution
    const categoryDistribution: Record<string, { labelHi: string; labelEn: string; count: number }> = {};
    for (const cat of CANONICAL_CATEGORIES) {
      const matching = queueHi.filter((s: any) => matchesCanonicalCategory(s, cat.id));
      categoryDistribution[cat.id] = {
        labelHi: cat.labelHi,
        labelEn: cat.labelEn,
        count: matching.length,
      };
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: now.toISOString(),
      archive_health: {
        totalCanonicalStories: queueHi.length,
        languageParity: {
          hindiCount: queueHi.length,
          englishCount: queueEn.length,
          parityMatch,
        },
        mediaAudit: {
          totalChecked: queueHi.length,
          mediaValidCount,
          mediaIntegrityPercent: queueHi.length ? Math.round((mediaValidCount / queueHi.length) * 100) : 0,
        },
        ageDistribution: {
          "0_1_days": health.buckets["0_1_days"],
          "2_3_days": health.buckets["2_3_days"],
          "4_7_days": health.buckets["4_7_days"],
          "8_14_days": health.buckets["8_14_days"],
          "15_21_days": health.buckets["15_21_days"],
          "22_30_days": health.buckets["22_30_days"],
          "older_than_30_days": health.buckets["older_than_30_days"],
        },
        chronology: {
          newestStoryPublishedAt: health.newestPublishedAt,
          oldestStoryPublishedAt: health.oldestPublishedAt,
          oldestStoryAgeDays: health.oldestAgeDays,
        },
        categoryDistribution,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
