import { NextResponse } from "next/server";
import {
  fetchGlobalBriefFeed,
  globalBriefRevalidate,
} from "@/lib/newsroom-platform/feeds/global-brief";
import type { GlobalBriefSegment } from "@/lib/newsroom-platform/content/types";

export const revalidate = 90;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const segment = (searchParams.get("segment") ?? "national") as GlobalBriefSegment;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "8");

  const feed = await fetchGlobalBriefFeed({
    segment: segment === "international" ? "international" : "national",
    page,
    pageSize,
    useMock: true,
  });

  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": `public, s-maxage=${globalBriefRevalidate}, stale-while-revalidate=90`,
    },
  });
}
