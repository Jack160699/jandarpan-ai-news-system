import { NextRequest, NextResponse } from "next/server";
import { executeSearch } from "@/lib/search/search";
import type { SearchDistrict, SearchTimeScope } from "@/lib/search/types";
import type { HomeSectionId } from "@/lib/homepage/types";

export const runtime = "nodejs";
export const revalidate = 60;

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

/**
 * GET /api/search?q=Raipur+crime+today&district=raipur&category=india&limit=15
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    30,
    Math.max(1, Number(searchParams.get("limit")) || 15)
  );

  if (!q && !searchParams.get("district") && !searchParams.get("category")) {
    const trending = await import("@/lib/search/trending-queries").then((m) =>
      m.getTrendingSearches(10)
    );
    return NextResponse.json(
      {
        ok: true,
        query: "",
        hits: [],
        total: 0,
        trending,
        tookMs: 0,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  }

  try {
    const result = await executeSearch(q || "Chhattisgarh news", {
      district: parseDistrict(searchParams.get("district")),
      category: parseCategory(searchParams.get("category")),
      timeScope: parseTimeScope(searchParams.get("time")),
      limit,
    });

    return NextResponse.json(
      { ok: true, ...result },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
