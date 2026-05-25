import { NextResponse } from "next/server";
import {
  IPL_SCORES_REVALIDATE_SEC,
  refreshIplScoresCache,
} from "@/lib/super-menu/ipl-scores";

/** Refresh every 3 minutes */
export const revalidate = 180;

export async function GET() {
  const snapshot = await refreshIplScoresCache();
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": `public, s-maxage=${IPL_SCORES_REVALIDATE_SEC}, stale-while-revalidate=60`,
    },
  });
}
