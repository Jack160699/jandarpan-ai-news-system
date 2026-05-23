import { NextResponse } from "next/server";
import { persistMonetizationEvent } from "@/lib/monetization/analytics";
import type { MonetizationEventType } from "@/lib/monetization/types";
import { getTenantConfig } from "@/lib/tenant/resolve";

export async function POST(request: Request) {
  let body: {
    eventType?: MonetizationEventType;
    slotId?: string;
    placementType?: string;
    articleSlug?: string;
    tenantSlug?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.eventType) {
    return NextResponse.json(
      { ok: false, error: "eventType_required" },
      { status: 400 }
    );
  }

  const tenant = await getTenantConfig();

  await persistMonetizationEvent({
    tenantId: tenant.id,
    eventType: body.eventType,
    slotId: body.slotId,
    placementType: body.placementType,
    articleSlug: body.articleSlug,
    metadata: body as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true });
}
