import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { isProductionDeployment } from "@/lib/infrastructure/production";
import { createAdminServerClient } from "@/lib/supabase";
import { getDefaultTenant } from "@/lib/tenant/registry";

/** Seed default monetization offers for the default tenant */
export async function POST(request: Request) {
  if (isProductionDeployment()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const tenant = getDefaultTenant();
  const supabase = createAdminServerClient();

  await supabase.from("newsletters").upsert(
    {
      tenant_id: tenant.id,
      slug: "daily-briefing",
      name_en: "CG Bhaskar Daily",
      name_hi: "सीजी भास्कर दैनिक",
      frequency: "daily",
      description: "Morning digest of Chhattisgarh headlines",
      active: true,
    },
    { onConflict: "tenant_id,slug" }
  );

  await supabase.from("reader_plans").upsert(
    [
      {
        tenant_id: tenant.id,
        slug: "reader",
        name_en: "Reader",
        name_hi: "पाठक",
        price_inr: 99,
        billing_interval: "month",
        features: ["Ad-light homepage", "Weekly newsletter"],
        sort_order: 0,
      },
      {
        tenant_id: tenant.id,
        slug: "insider",
        name_en: "Insider",
        name_hi: "इनसाइडर",
        price_inr: 299,
        billing_interval: "month",
        features: [
          "All Reader perks",
          "Premium district reports",
          "Breaking SMS alerts",
        ],
        sort_order: 1,
      },
    ],
    { onConflict: "tenant_id,slug" }
  );

  await supabase.from("affiliate_placements").delete().eq("tenant_id", tenant.id);
  await supabase.from("affiliate_placements").insert({
    tenant_id: tenant.id,
    slot_id: "affiliate_rail",
    partner_name: "Local partner",
    title: "Explore Chhattisgarh tourism",
    description: "Curated stays and heritage tours",
    target_url: "https://example.com/tourism",
    enabled: true,
    sort_order: 0,
  });

  await supabase.from("premium_reports").upsert(
    {
      tenant_id: tenant.id,
      slug: "bastar-election-brief",
      title: "Bastar Election Brief 2026",
      excerpt: "District-by-district analysis for editors and subscribers.",
      price_inr: 149,
      is_paywalled: true,
      published_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,slug" }
  );

  return NextResponse.json({ ok: true, tenantSlug: tenant.slug });
}
