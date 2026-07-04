import { NextResponse } from "next/server";
import { persistReaderEvents } from "@/lib/analytics/persist";
import { analyticsOptedOut } from "@/lib/analytics/privacy";
import type { ReaderEventInput } from "@/lib/analytics/types";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  sessionHash?: string;
  events?: ReaderEventInput[];
};

export async function POST(request: Request) {
  const rate = await checkPublicApiRateLimit(request, "analytics-events", 120, 60);
  if (!rate.allowed) return rate.response;

  if (analyticsOptedOut()) {
    return NextResponse.json({ ok: true, skipped: "dnt" });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const events = body.events ?? [];
  if (!events.length) {
    return NextResponse.json({ ok: false, error: "no_events" }, { status: 400 });
  }

  if (events.length > 40) {
    return NextResponse.json({ ok: false, error: "batch_too_large" }, { status: 400 });
  }

  const tenant = await getTenantConfig();
  const result = await persistReaderEvents(
    tenant.id,
    body.sessionHash ?? null,
    events
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
