import { NextRequest, NextResponse } from "next/server";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import {
  buildHyperlocalFeedBundle,
  parseRegionalPrefsFromQuery,
} from "@/lib/regional";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const prefs = parseRegionalPrefsFromQuery(request.nextUrl.searchParams);
  const pool = await fetchGeneratedArticlePool(100);
  const bundle = buildHyperlocalFeedBundle(pool, {
    homeDistrict: prefs.homeDistrict,
    maxDistricts: 10,
    perDistrict: 8,
  });

  return NextResponse.json(bundle);
}
