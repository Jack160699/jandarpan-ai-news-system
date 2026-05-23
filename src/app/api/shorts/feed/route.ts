import { NextResponse } from "next/server";
import { fetchShortsPool } from "@/lib/news/shorts/build-short";

export const dynamic = "force-dynamic";

export async function GET() {
  const shorts = await fetchShortsPool(24);
  return NextResponse.json({
    shorts,
    count: shorts.length,
    fetchedAt: new Date().toISOString(),
  });
}
