/**
 * POST/GET /api/admin/ops/trigger-editorial
 * Hardened production endpoint for triggering autonomous editorial generation.
 * Security: Header-based authentication only via CRON_ADMIN_SECRET / ADMIN_SECRET.
 * Quality: Pure autonomous pipeline execution without bypass or forcePublish.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { generateEditorialFromEvent } from "@/lib/news/ai/generate-article";
import { isAnyChatProviderConfigured } from "@/lib/ai/providers/chat";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import type { NewsEventRow } from "@/lib/types/newsroom";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const bearer = auth?.replace(/^Bearer\s+/i, "").trim();
  const cronHeader = request.headers.get("x-cron-secret")?.trim();

  const provided = bearer || cronHeader;
  if (!provided) return false;

  const secrets = [
    process.env.CRON_ADMIN_SECRET,
    process.env.ADMIN_SECRET,
    process.env.CRON_SECRET,
    process.env.CRON_API_SECRET,
  ]
    .map((s) => s?.trim())
    .filter(Boolean) as string[];

  if (secrets.length === 0) return false;

  return secrets.some((s) => {
    try {
      const a = Buffer.from(provided);
      const b = Buffer.from(s);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

async function handleTrigger(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  if (!isAnyChatProviderConfigured()) {
    return NextResponse.json(
      { ok: false, error: "No AI provider configured" },
      { status: 503, headers: noStoreHeaders() }
    );
  }

  try {
    const url = new URL(request.url);
    const eventIdParam = url.searchParams.get("eventId");
    const supabase = createAdminServerClient();
    let targetEvent: NewsEventRow | null = null;

    if (eventIdParam) {
      const { data, error } = await supabase
        .from("news_events")
        .select("*")
        .eq("id", eventIdParam)
        .single();
      if (error || !data) {
        return NextResponse.json(
          { ok: false, error: "Event not found" },
          { status: 404, headers: noStoreHeaders() }
        );
      }
      targetEvent = data as NewsEventRow;
    } else {
      const { data: draftedRows } = await supabase
        .from("generated_articles")
        .select("event_id")
        .not("event_id", "is", null);
      const usedIds = new Set((draftedRows || []).map((r: { event_id: string }) => r.event_id));

      const { data: events, error } = await supabase
        .from("news_events")
        .select("*")
        .order("urgency_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !events?.length) {
        return NextResponse.json(
          { ok: false, error: "Failed to fetch eligible events" },
          { status: 500, headers: noStoreHeaders() }
        );
      }

      for (const ev of events as NewsEventRow[]) {
        if (!usedIds.has(ev.id) && ev.signal_ids && ev.signal_ids.length > 0) {
          targetEvent = ev;
          break;
        }
      }
    }

    if (!targetEvent) {
      return NextResponse.json(
        { ok: false, error: "No eligible unhandled event found" },
        { status: 404, headers: noStoreHeaders() }
      );
    }

    // Pure autonomous generation – no forcePublish bypass
    const genResult = await generateEditorialFromEvent(targetEvent);

    const liveUrl = genResult.article?.published_at && genResult.article?.slug
      ? `https://www.jandarpan.news/story/${genResult.article.slug}`
      : null;

    return NextResponse.json(
      {
        ok: genResult.ok,
        eventId: targetEvent.id,
        canonicalTitle: targetEvent.canonical_title,
        article: genResult.article,
        quality: genResult.quality,
        skipped: genResult.skipped,
        reason: genResult.reason,
        liveUrl,
      },
      { headers: noStoreHeaders() }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal error",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

export async function GET(request: Request) {
  return handleTrigger(request);
}

export async function POST(request: Request) {
  return handleTrigger(request);
}
