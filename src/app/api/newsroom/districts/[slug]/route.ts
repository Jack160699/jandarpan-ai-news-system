import { NextResponse } from "next/server";
import {
  districtRevalidate,
  fetchDistrictFeed,
} from "@/lib/newsroom-platform/feeds/district";

export const revalidate = 120;

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "12");
  const section = searchParams.get("section") ?? undefined;

  const { isSupabaseConfigured } = await import("@/lib/supabase");
  const feed = await fetchDistrictFeed({
    district: slug,
    page,
    pageSize,
    section,
    useMock: !isSupabaseConfigured(),
  });

  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": `public, s-maxage=${districtRevalidate}, stale-while-revalidate=120`,
    },
  });
}
