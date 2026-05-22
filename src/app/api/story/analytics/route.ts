import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

type AnalyticsBody = {
  event: "view" | "dwell" | "share" | "trending_click";
  slug: string;
  dwellMs?: number;
  source?: string | null;
  category?: string;
  provider?: string | null;
};

export async function POST(request: Request) {
  let body: AnalyticsBody;

  try {
    body = (await request.json()) as AnalyticsBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.slug || !body.event) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  console.log("[story-analytics]", body);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase.from("ingestion_logs").insert({
        status: `story_${body.event}`,
        total_fetched: 1,
        metadata: body,
      });
    } catch {
      /* non-blocking */
    }
  }

  return NextResponse.json({ ok: true });
}
