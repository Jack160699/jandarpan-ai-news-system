import { NextRequest, NextResponse } from "next/server";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { getTrendingSearchesForLanguage } from "@/lib/i18n/trending-searches";
import { executeSearch } from "@/lib/search/search";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";
import type { SearchDistrict, SearchTimeScope } from "@/lib/search/types";
import type { HomeSectionId } from "@/lib/homepage/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DISTRICTS = new Set([
  "raipur",
  "bilaspur",
  "bastar",
  "durg",
  "bhilai",
  "korba",
  "jagdalpur",
  "ambikapur",
  "raigarh",
  "chhattisgarh",
]);

const VALID_SECTIONS = new Set([
  "chhattisgarh",
  "raipur",
  "india",
  "world",
  "business",
  "sports",
  "education",
]);

function parseDistrict(v: string | null): SearchDistrict | null {
  if (!v || !VALID_DISTRICTS.has(v)) return null;
  return v as SearchDistrict;
}

function parseCategory(v: string | null): HomeSectionId | null {
  if (!v || !VALID_SECTIONS.has(v)) return null;
  return v as HomeSectionId;
}

function parseTimeScope(v: string | null): SearchTimeScope | undefined {
  if (v === "today" || v === "week" || v === "all") return v;
  return undefined;
}

const LANGUAGE_AWARE_HEADERS = {
  "Cache-Control": "private, no-cache",
  Vary: "Cookie",
};

/**
 * GET /api/search?q=Raipur+crime+today&district=raipur&category=india&limit=15
 */
export async function GET(request: NextRequest) {
  const rate = await checkPublicApiRateLimit(request, "search", 120, 60);
  if (!rate.allowed) return rate.response;

  const displayLanguage = await getServerReaderLanguage();
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    30,
    Math.max(1, Number(searchParams.get("limit")) || 15)
  );

  if (!q && !searchParams.get("district") && !searchParams.get("category")) {
    const trending = getTrendingSearchesForLanguage(displayLanguage, 10);
    return NextResponse.json(
      {
        ok: true,
        query: "",
        hits: [],
        total: 0,
        trending,
        tookMs: 0,
      },
      { headers: LANGUAGE_AWARE_HEADERS }
    );
  }

  try {
    const result = await executeSearch(
      q || "Chhattisgarh news",
      {
        district: parseDistrict(searchParams.get("district")),
        category: parseCategory(searchParams.get("category")),
        timeScope: parseTimeScope(searchParams.get("time")),
        limit,
      },
      displayLanguage
    );

    return NextResponse.json(
      { ok: true, ...result },
      { headers: LANGUAGE_AWARE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
