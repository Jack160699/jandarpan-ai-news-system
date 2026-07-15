import { NextResponse } from "next/server";
import type { ReaderEventType } from "@/lib/analytics/types";
import { persistReaderEvents } from "@/lib/analytics/persist";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";
import { asJsonObject } from "@/types/json";

const AUDIO_EVENTS = new Set<ReaderEventType>([
  "audio_launcher_shown",
  "audio_launcher_opened",
  "audio_launcher_dismissed",
  "audio_play",
  "audio_pause",
  "audio_story_skipped",
  "audio_story_completed",
  "audio_queue_completed",
]);

export async function POST(request: Request) {
  const rate = await checkPublicApiRateLimit(request, "audio-analytics", 120, 60);
  if (!rate.allowed) return rate.response;

  let body: { eventType?: ReaderEventType; slug?: string; index?: number; total?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.eventType || !AUDIO_EVENTS.has(body.eventType)) {
    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  }

  const tenant = await getTenantConfig();
  await persistReaderEvents(tenant.id, null, [
    {
      eventType: body.eventType,
      articleSlug: body.slug,
      surface: "audio",
      metadata: asJsonObject({
        ...(body.index != null ? { index: body.index } : {}),
        ...(body.total != null ? { total: body.total } : {}),
      }),
    },
  ]);
  return NextResponse.json({ ok: true });
}
