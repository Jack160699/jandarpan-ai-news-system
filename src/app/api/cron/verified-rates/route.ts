import { NextRequest, NextResponse } from "next/server";
import { FUEL_CITY_SLUGS, RATE_CATEGORIES } from "@/lib/verified-rates";
import { runVerification } from "@/lib/verified-rates/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Scheduled verification — persists only real provider results.
 * Auth: CRON_SECRET bearer / query (same pattern as other crons).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  const q = req.nextUrl.searchParams.get("secret") ?? "";
  const ok =
    Boolean(secret) &&
    (auth === `Bearer ${secret}` || q === secret);
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const city of FUEL_CITY_SLUGS) {
    for (const category of ["petrol", "diesel"] as const) {
      const r = await runVerification({ category, citySlug: city });
      results.push({ category, city, ...r });
    }
  }

  for (const category of RATE_CATEGORIES.filter((c) =>
    c.startsWith("gold") || c.startsWith("silver")
  )) {
    const r = await runVerification({ category, citySlug: null });
    results.push({ category, city: null, ...r });
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    results,
  });
}
