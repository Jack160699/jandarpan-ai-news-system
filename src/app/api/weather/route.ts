import { NextRequest, NextResponse } from "next/server";
import { getDistrict } from "@/lib/regional/districts";

export const runtime = "nodejs";

/** WMO weather codes → compact Hindi condition */
function conditionHi(code: number): string {
  if (code === 0) return "साफ़";
  if (code <= 2) return "आंशिक बादल";
  if (code === 3) return "बादल";
  if (code <= 48) return "कोहरा";
  if (code <= 57) return "बूंदाबांदी";
  if (code <= 67) return "बारिश";
  if (code <= 77) return "बर्फ़";
  if (code <= 82) return "तेज़ बारिश";
  if (code <= 86) return "बर्फ़बारी";
  return "आंधी-तूफ़ान";
}

function conditionEn(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Heavy rain";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

type OpenMeteoCurrent = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
  };
};

/**
 * District weather — Open-Meteo (no API key), server-cached 30 min.
 * Graceful: returns { ok: false } instead of erroring so the header
 * simply hides the temperature when weather is unavailable.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("district") ?? "raipur";
  const district = getDistrict(slug) ?? getDistrict("raipur");

  if (!district?.lat || !district?.lng) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}` +
      `&longitude=${district.lng}` +
      `&current=temperature_2m,weather_code,is_day&timezone=Asia%2FKolkata`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    const data = (await res.json()) as OpenMeteoCurrent;
    const temp = data.current?.temperature_2m;
    const code = data.current?.weather_code ?? 0;
    if (typeof temp !== "number" || !Number.isFinite(temp)) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    return NextResponse.json(
      {
        ok: true,
        district: district.slug,
        tempC: Math.round(temp),
        conditionHi: conditionHi(code),
        conditionEn: conditionEn(code),
        isDay: data.current?.is_day === 1,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
