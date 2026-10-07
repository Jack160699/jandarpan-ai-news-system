import { NextRequest, NextResponse } from "next/server";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { selectFeedRows } from "@/lib/feed/feed-selector";
import {
  buildLocalBreakingAlerts,
  parseRegionalPrefsFromQuery,
} from "@/lib/regional";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const prefs = parseRegionalPrefsFromQuery(request.nextUrl.searchParams);
  const pool = selectFeedRows(await fetchGeneratedArticlePool(80, { select: "homepage" }), {
    feed: "public_all",
    order: "chronological",
  }).rows;
  const alerts = buildLocalBreakingAlerts(pool, {
    homeDistrict: prefs.homeDistrict,
    cgOnly: true,
    limit: 12,
  });

  return NextResponse.json({
    alerts,
    homeDistrict: prefs.homeDistrict ?? null,
    fetchedAt: new Date().toISOString(),
  });
}
