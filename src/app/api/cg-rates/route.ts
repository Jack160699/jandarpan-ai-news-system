import { NextResponse } from "next/server";
import { getCachedCgDailyRates } from "@/lib/super-menu/cg-rates";

/** ~4 refreshes per day */
export const revalidate = 21600;

export async function GET() {
  const snapshot = getCachedCgDailyRates();
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=1800",
    },
  });
}
