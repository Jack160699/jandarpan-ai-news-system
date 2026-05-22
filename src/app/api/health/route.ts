/**
 * Health endpoint for GitHub Actions / monitoring
 */

import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "edge";

export async function GET() {
  const providers = {
    gnews: Boolean(process.env.GNEWS_API_KEY?.trim()),
    newsdata: Boolean(process.env.NEWSDATA_API_KEY?.trim()),
    rss: true,
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    supabase: isSupabaseConfigured(),
    cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
  };

  const healthy =
    providers.supabase &&
    (providers.gnews || providers.newsdata || providers.rss);

  return NextResponse.json(
    {
      ok: healthy,
      service: "newspaper-motion",
      timestamp: new Date().toISOString(),
      providers,
    },
    { status: healthy ? 200 : 503 }
  );
}
