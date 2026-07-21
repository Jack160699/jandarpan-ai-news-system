import { NextRequest, NextResponse } from "next/server";
import { isFuelCitySlug, isRateCategory } from "@/lib/verified-rates";
import { isHistoryRange } from "@/lib/verified-rates/history";
import { getRateHistory } from "@/lib/verified-rates/service";
import type { HistoryRange, RateCategory } from "@/lib/verified-rates/types";

export const runtime = "nodejs";

const SECRET_MARKERS = [
  "ULIP_API_KEY",
  "IBJA_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE",
  "ACCESS_TOKEN",
  "api_key",
  "password",
];

function assertSafePayload(body: unknown): void {
  const text = JSON.stringify(body);
  for (const marker of SECRET_MARKERS) {
    if (text.includes(marker)) {
      throw new Error("secret_leak_blocked");
    }
  }
  if (text.includes("undefined") || text.includes("NaN")) {
    throw new Error("unsafe_numeric_payload");
  }
}

/**
 * Safe verified-rates history API.
 * Allowlisted query: category, city, range, language.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const categoryRaw = (sp.get("category") ?? "").trim().toLowerCase();
  const cityRaw = (sp.get("city") ?? "").trim().toLowerCase();
  const rangeRaw = (sp.get("range") ?? "30D").trim().toUpperCase();
  const langRaw = (sp.get("language") ?? "hi").trim().toLowerCase();

  if (!isRateCategory(categoryRaw)) {
    return NextResponse.json({ status: "unavailable", error: "invalid_category" }, { status: 400 });
  }
  const category = categoryRaw as RateCategory;

  if (!isHistoryRange(rangeRaw)) {
    return NextResponse.json({ status: "unavailable", error: "invalid_range" }, { status: 400 });
  }

  const citySlug = cityRaw ? cityRaw : null;
  if (citySlug && !isFuelCitySlug(citySlug)) {
    return NextResponse.json({ status: "unavailable", error: "invalid_city" }, { status: 400 });
  }

  const language = langRaw === "en" ? "en" : "hi";
  const result = await getRateHistory({
    category,
    citySlug,
    range: rangeRaw as HistoryRange,
    language,
  });

  if ("error" in result) {
    return NextResponse.json(
      { status: "unavailable", error: result.error },
      { status: result.error === "unsupported_combination" ? 404 : 400 }
    );
  }

  // Redact internals — response already public-shaped
  const publicBody = {
    status: result.status,
    category: result.category,
    location: result.location,
    currency: result.currency,
    unit: result.unit,
    purity: result.purity,
    range: result.range,
    availableFrom: result.availableFrom,
    availableTo: result.availableTo,
    current: result.current,
    points: result.points,
    movement: {
      status: result.movement.status,
      absolute: result.movement.absolute,
      percentage: result.movement.percentage,
    },
    statistics: result.statistics,
    availableRanges: result.availableRanges,
    graphEligible: result.graphEligible,
    disclaimerHi: result.disclaimerHi,
    methodologyPath: result.methodologyPath,
  };

  try {
    assertSafePayload(publicBody);
  } catch {
    return NextResponse.json({ status: "unavailable", error: "unsafe_payload" }, { status: 500 });
  }

  return NextResponse.json(publicBody, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
