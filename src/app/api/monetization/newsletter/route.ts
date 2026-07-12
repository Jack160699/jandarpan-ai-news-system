import { NextResponse } from "next/server";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { persistMonetizationEvent } from "@/lib/monetization/analytics";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { clientSafeErrorMessage } from "@/lib/security/safe-api-error";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";
import { asJsonObject } from "@/types/json";

export async function POST(request: Request) {
  const rate = await checkPublicApiRateLimit(request, "newsletter-signup", 10, 3600);
  if (!rate.allowed) return rate.response;

  let body: { email?: string; newsletterSlug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const tenant = await getTenantConfig();

  if (!isSupabaseConfigured()) {
    await persistMonetizationEvent({
      tenantId: tenant.id,
      eventType: "newsletter_signup",
      metadata: asJsonObject({
        email,
        ...(body.newsletterSlug != null ? { newsletterSlug: body.newsletterSlug } : {}),
      } as Record<string, unknown>),
    });
    return NextResponse.json({ ok: true, mode: "logged_only" });
  }

  const supabase = createAdminServerClient();

  let newsletterId: string | null = null;

  if (body.newsletterSlug) {
    const { data: nl } = await supabase
      .from("newsletters")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("slug", body.newsletterSlug)
      .maybeSingle();
    newsletterId = nl?.id ?? null;
  }

  if (!newsletterId) {
    const { data: first } = await supabase
      .from("newsletters")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    newsletterId = first?.id ?? null;
  }

  if (!newsletterId) {
    const { data: created } = await supabase
      .from("newsletters")
      .insert({
        tenant_id: tenant.id,
        slug: "daily-briefing",
        name_en: "Daily Briefing",
        name_hi: "दैनिक ब्रीफिंग",
        frequency: "daily",
        description: "Top stories from your newsroom",
      })
      .select("id")
      .single();
    newsletterId = created?.id ?? null;
  }

  if (!newsletterId) {
    return NextResponse.json(
      { ok: false, error: "newsletter_unavailable" },
      { status: 503 }
    );
  }

  const { error } = await supabase.from("newsletter_subscribers").upsert(
    {
      newsletter_id: newsletterId,
      email,
      status: "pending",
    },
    { onConflict: "newsletter_id,email" }
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: clientSafeErrorMessage(error) },
      { status: 500 }
    );
  }

  await persistMonetizationEvent({
    tenantId: tenant.id,
    eventType: "newsletter_signup",
    metadata: { email, newsletterId },
  });

  return NextResponse.json({ ok: true });
}
