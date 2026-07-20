import { NextRequest, NextResponse } from "next/server";
import { fetchDistrictWeather, toWeatherApiJson } from "@/lib/weather";
import { WEATHER_REVALIDATE_SEC } from "@/lib/weather/types";

export const runtime = "nodejs";

/**
 * District weather — Open-Meteo (no API key), server-cached ~30 min.
 * Graceful: returns { ok: false } so the UI can omit temperature honestly.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("district") ?? "raipur";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const snapshot = await fetchDistrictWeather({
      districtSlug: slug,
      signal: controller.signal,
      revalidateSec: WEATHER_REVALIDATE_SEC,
    });
    const body = toWeatherApiJson(snapshot);
    return NextResponse.json(body, {
      status: 200,
      headers: {
        "Cache-Control": `public, s-maxage=${WEATHER_REVALIDATE_SEC}, stale-while-revalidate=600`,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}
