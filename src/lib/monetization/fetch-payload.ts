/**
 * Load monetization payload for a tenant (static config + optional DB overlay)
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { defaultMonetizationSettings } from "@/lib/monetization/placements";
import type {
  AffiliateUnit,
  MonetizationPayload,
  NewsletterOffer,
  PlacementUnit,
  PremiumReportTeaser,
  ReaderPlan,
  TenantMonetizationSettings,
} from "@/lib/monetization/types";
import type { TenantConfig } from "@/lib/tenant/types";

function mergeSettings(
  tenant: TenantConfig,
  dbPlacements?: PlacementUnit[]
): TenantMonetizationSettings {
  const base =
    tenant.monetization ?? defaultMonetizationSettings();

  if (!dbPlacements?.length) return base;

  const bySlot = new Map(base.placements.map((p) => [p.slotId, p]));
  for (const p of dbPlacements) {
    bySlot.set(p.slotId, p);
  }

  return {
    ...base,
    placements: [...bySlot.values()],
  };
}

import { unstable_cache } from "next/cache";

type DbPayloadResult = {
  dbPlacements: PlacementUnit[];
  plans: ReaderPlan[];
  newsletters: NewsletterOffer[];
  affiliates: AffiliateUnit[];
  premiumReports: PremiumReportTeaser[];
};

async function fetchMonetizationDbRaw(tenantId: string): Promise<DbPayloadResult> {
  const empty: DbPayloadResult = {
    dbPlacements: [],
    plans: [],
    newsletters: [],
    affiliates: [],
    premiumReports: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = createAdminServerClient();

  const [placementsRes, plansRes, newslettersRes, affiliatesRes, reportsRes] =
    await Promise.all([
      supabase
        .from("monetization_placements")
        .select("slot_id, placement_type, label, enabled, config, priority")
        .eq("tenant_id", tenantId)
        .eq("enabled", true)
        .order("priority", { ascending: true }),
      supabase
        .from("reader_plans")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("newsletters")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true),
      supabase
        .from("affiliate_placements")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("enabled", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("premium_reports")
        .select("*")
        .eq("tenant_id", tenantId)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(6),
    ]);

  const dbPlacements: PlacementUnit[] = (placementsRes.data ?? []).map((r) => ({
    slotId: r.slot_id as PlacementUnit["slotId"],
    type: r.placement_type as PlacementUnit["type"],
    label: r.label ?? undefined,
    enabled: r.enabled,
    config: (r.config ?? {}) as PlacementUnit["config"],
  }));

  const plans: ReaderPlan[] = (plansRes.data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    nameEn: p.name_en,
    nameHi: p.name_hi,
    priceInr: p.price_inr,
    billingInterval: p.billing_interval as ReaderPlan["billingInterval"],
    features: Array.isArray(p.features)
      ? (p.features as string[])
      : [],
  }));

  const newsletters: NewsletterOffer[] = (newslettersRes.data ?? []).map((n) => ({
    id: n.id,
    slug: n.slug,
    nameEn: n.name_en,
    nameHi: n.name_hi,
    frequency: n.frequency,
    description: n.description,
  }));

  const affiliates: AffiliateUnit[] = (affiliatesRes.data ?? []).map((a) => ({
    id: a.id,
    slotId: a.slot_id,
    partnerName: a.partner_name,
    title: a.title,
    description: a.description,
    imageUrl: a.image_url,
    targetUrl: a.target_url,
    disclosureEn: a.disclosure_en ?? "Affiliate link",
    disclosureHi: a.disclosure_hi ?? "सहबद्ध लिंक",
  }));

  const premiumReports: PremiumReportTeaser[] = (reportsRes.data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    heroImageUrl: r.hero_image_url,
    priceInr: r.price_inr,
    isPaywalled: r.is_paywalled,
  }));

  return {
    dbPlacements,
    plans,
    newsletters,
    affiliates,
    premiumReports,
  };
}

function getCachedMonetizationLoader(tenantId: string, tenantSlug: string) {
  return unstable_cache(
    () => fetchMonetizationDbRaw(tenantId),
    ["monetization-payload", tenantSlug],
    {
      revalidate: 300,
      tags: ["monetization", `monetization:${tenantSlug}`],
    }
  );
}

export async function fetchMonetizationPayload(
  tenant: TenantConfig
): Promise<MonetizationPayload> {
  const empty: MonetizationPayload = {
    tenantSlug: tenant.slug,
    settings: tenant.monetization ?? defaultMonetizationSettings(),
    plans: [],
    newsletters: [],
    affiliates: [],
    premiumReports: [],
  };

  if (!isSupabaseConfigured()) return empty;

  try {
    const data = await getCachedMonetizationLoader(tenant.id, tenant.slug)();
    const settings = mergeSettings(tenant, data.dbPlacements);
    return {
      tenantSlug: tenant.slug,
      settings,
      plans: data.plans,
      newsletters: data.newsletters,
      affiliates: data.affiliates,
      premiumReports: data.premiumReports,
    };
  } catch {
    const data = await fetchMonetizationDbRaw(tenant.id);
    const settings = mergeSettings(tenant, data.dbPlacements);
    return {
      tenantSlug: tenant.slug,
      settings,
      plans: data.plans,
      newsletters: data.newsletters,
      affiliates: data.affiliates,
      premiumReports: data.premiumReports,
    };
  }
}

export async function fetchSponsoredStory(
  tenantId: string,
  articleSlug: string
) {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("sponsored_stories")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("article_slug", articleSlug)
    .or(`active_until.is.null,active_until.gte.${now}`)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    sponsorName: data.sponsor_name,
    sponsorLogoUrl: data.sponsor_logo_url,
    disclosureEn: data.disclosure_en,
    disclosureHi: data.disclosure_hi,
    ctaUrl: data.cta_url,
    ctaLabel: data.cta_label,
  };
}
