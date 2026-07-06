import { NextResponse } from "next/server";
import {
  breakingRevalidate,
  fetchBreakingFeed,
} from "@/lib/newsroom-platform/feeds/breaking";
import { isProductionDeployment } from "@/lib/infrastructure/production";

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "12");

  const { isSupabaseConfigured } = await import("@/lib/supabase");
  const configured = isSupabaseConfigured();

  if (isProductionDeployment() && !configured) {
    return NextResponse.json(
      { ok: false, error: "service_unavailable" },
      { status: 503 }
    );
  }

  const feed = await fetchBreakingFeed({
    limit,
    useMock: !configured,
  });

  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": `public, s-maxage=${breakingRevalidate}, stale-while-revalidate=60`,
    },
  });
}
