import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { MonetizationEventType } from "@/lib/monetization/types";

export function logMonetizationAnalytics(payload: Record<string, unknown>): void {
  console.log("[MONETIZATION_ANALYTICS]", JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
  }));
}

export async function persistMonetizationEvent(input: {
  tenantId?: string | null;
  eventType: MonetizationEventType;
  slotId?: string;
  placementType?: string;
  articleSlug?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  logMonetizationAnalytics(input);

  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createAdminServerClient();
    await supabase.from("monetization_events").insert({
      tenant_id: input.tenantId ?? null,
      event_type: input.eventType,
      slot_id: input.slotId ?? null,
      placement_type: input.placementType ?? null,
      article_slug: input.articleSlug ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    /* non-blocking */
  }
}
