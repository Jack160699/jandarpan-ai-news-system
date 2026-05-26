import { NextResponse } from "next/server";
import {
  breakingRevalidate,
  fetchBreakingFeed,
} from "@/lib/newsroom-platform/feeds/breaking";

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "12");

  const { isSupabaseConfigured } = await import("@/lib/supabase");
  const feed = await fetchBreakingFeed({
    limit,
    useMock: !isSupabaseConfigured(),
  });

  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": `public, s-maxage=${breakingRevalidate}, stale-while-revalidate=60`,
    },
  });
}
