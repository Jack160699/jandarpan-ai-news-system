import { NextResponse } from "next/server";
import {
  fetchTopicFeed,
  topicRevalidate,
} from "@/lib/newsroom-platform/feeds/topics";

export const revalidate = 300;

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "12");

  const { isSupabaseConfigured } = await import("@/lib/supabase");
  const feed = await fetchTopicFeed({
    slug,
    page,
    pageSize,
    useMock: !isSupabaseConfigured(),
  });

  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": `public, s-maxage=${topicRevalidate}, stale-while-revalidate=180`,
    },
  });
}
