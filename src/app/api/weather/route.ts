import { NextRequest, NextResponse } from "next/server";
import { getDistrict } from "@/lib/regional/districts";

export const revalidate = 900;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("district")?.trim().toLowerCase() ?? "raipur";
  const district = getDistrict(slug) ?? getDistrict("raipur");
  const latitude = district?.lat ?? 21.2514;
  const longitude = district?.lng ?? 81.6296;

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("current", "temperature_2m");
    url.searchParams.set("timezone", "Asia/Kolkata");
    const response = await fetch(url, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error("weather_unavailable");
    const data = (await response.json()) as { current?: { temperature_2m?: number } };
    const temperature = data.current?.temperature_2m;
    if (typeof temperature !== "number") throw new Error("weather_missing");
    return NextResponse.json({ temperature, district: district?.slug ?? "raipur" });
  } catch {
    return NextResponse.json(
      { temperature: null, district: district?.slug ?? "raipur" },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  }
}
