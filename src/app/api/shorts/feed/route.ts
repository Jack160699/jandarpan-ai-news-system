import { NextResponse } from "next/server";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchShortsPool } from "@/lib/news/shorts/build-short";

export const dynamic = "force-dynamic";

export async function GET() {
  const displayLanguage = await getServerReaderLanguage();
  const shorts = await fetchShortsPool(24, displayLanguage);
  return NextResponse.json(
    {
      shorts,
      count: shorts.length,
      fetchedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "private, no-cache",
        Vary: "Cookie",
      },
    }
  );
}
