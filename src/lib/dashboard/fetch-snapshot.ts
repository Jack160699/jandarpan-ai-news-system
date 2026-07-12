/**
 * Tenant-scoped SaaS dashboard snapshot
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { fetchEditorialDashboard } from "@/lib/editorial-dashboard/fetch-dashboard";
import type { DashboardSession } from "@/lib/saas-auth/types";
import type {
  DashboardApiMetric,
  DashboardAuditEntry,
  DashboardBillingPlan,
  DashboardProviderMetric,
  DashboardTeamMember,
  SaasDashboardSnapshot,
} from "@/lib/dashboard/types";

export async function fetchSaasDashboard(
  session: DashboardSession
): Promise<SaasDashboardSnapshot | null> {
  const tenantId = session.membership.tenantId;
  const base = await fetchEditorialDashboard(tenantId);
  if (!base) return null;

  const { tenantSlug, tenantName } = session.membership;

  if (!isSupabaseConfigured()) {
    return wrapSnapshot(base, session, {
      billing: defaultBilling(),
      team: [devTeamMember(session)],
      apiMetrics: [],
      providerMetrics: [],
      recentAudit: [],
      scopedArticles: base.generatedArticles,
    });
  }

  const supabase = createAdminServerClient();

  const [
    articlesRes,
    billingRes,
    teamRes,
    auditRes,
    apiRes,
    apiHealthRes,
    signalsCount,
    eventsCount,
  ] = await Promise.all([
    supabase
      .from("generated_articles")
      .select(
        "id, slug, headline, summary, editorial_status, workflow_status, homepage_pin, published_at, editorial_metadata, language, created_at, hero_image_url, event_id, tenant_id, tags"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("tenant_billing")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("tenant_memberships")
      .select("id, email, role, status, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("editorial_audit_log")
      .select("id, action, resource_type, resource_id, user_email, payload, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tenant_api_requests")
      .select("route, method, status_code, latency_ms, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("api_provider_health").select("*"),
    supabase
      .from("news_signals")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("news_events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  const scopedArticles = filterArticlesToTenant(
    base.generatedArticles,
    articlesRes.data ?? []
  );

  const billing = mapBilling(billingRes.data);
  const team = (teamRes.data ?? []).map((m) => ({
    id: m.id,
    email: m.email,
    role: m.role,
    status: m.status,
    createdAt: m.created_at,
  }));

  const recentAudit: DashboardAuditEntry[] = (auditRes.data ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    resourceType: a.resource_type,
    resourceId: a.resource_id,
    userEmail: a.user_email,
    createdAt: a.created_at,
    payload: (a.payload ?? {}) as Record<string, unknown>,
  }));

  const apiMetrics = aggregateApiMetrics(apiRes.data ?? []);

  const providerMetrics: DashboardProviderMetric[] = (
    apiHealthRes.data ?? []
  ).map((p) => ({
    providerId: p.provider_id,
    healthy:
      (p.health_score ?? 0) >= 50 &&
      (!p.disabled_until ||
        new Date(p.disabled_until).getTime() <= Date.now()),
    healthScore: p.health_score ?? 0,
    failureCount: p.failure_count ?? 0,
    consecutiveFailures: p.consecutive_failures ?? 0,
    avgLatencyMs: p.avg_latency_ms ?? 0,
    lastArticleCount: p.last_article_count ?? 0,
    disabledUntil: p.disabled_until,
  }));

  const pending = scopedArticles.filter(
    (a) => a.editorial_status === "pending"
  ).length;
  const approved = scopedArticles.filter(
    (a) => a.editorial_status === "approved"
  ).length;

  return wrapSnapshot(
    {
      ...base,
      counts: {
        ...base.counts,
        signals: signalsCount.count ?? base.counts.signals,
        events: eventsCount.count ?? base.counts.events,
        generated: scopedArticles.length,
        pending,
        approved,
      },
      generatedArticles: scopedArticles,
      sourceHealth: base.sourceHealth,
    },
    session,
    {
      billing,
      team,
      apiMetrics,
      providerMetrics,
      recentAudit,
      scopedArticles,
    }
  );
}

function wrapSnapshot(
  base: Awaited<ReturnType<typeof fetchEditorialDashboard>>,
  session: DashboardSession,
  extra: {
    billing: DashboardBillingPlan | null;
    team: DashboardTeamMember[];
    apiMetrics: DashboardApiMetric[];
    providerMetrics: DashboardProviderMetric[];
    recentAudit: DashboardAuditEntry[];
    scopedArticles: SaasDashboardSnapshot["generatedArticles"];
  }
): SaasDashboardSnapshot {
  if (!base) throw new Error("missing base snapshot");

  return {
    ...base,
    generatedArticles: extra.scopedArticles,
    tenant: {
      id: session.membership.tenantId,
      slug: session.membership.tenantSlug,
      name: session.membership.tenantName,
    },
    billing: extra.billing,
    team: extra.team,
    apiMetrics: extra.apiMetrics,
    providerMetrics: extra.providerMetrics,
    recentAudit: extra.recentAudit,
  };
}

function filterArticlesToTenant(
  fallback: SaasDashboardSnapshot["generatedArticles"],
  scoped: Array<Record<string, unknown>>
) {
  if (!scoped.length) return fallback;

  const ids = new Set(scoped.map((r) => r.id as string));
  const fromBase = fallback.filter((a) => ids.has(a.id));
  if (fromBase.length) return fromBase;

  return scoped.map((row) => {
    const meta = (row.editorial_metadata ?? {}) as Record<string, unknown>;
    const breakdown = (meta.quality_breakdown ?? {}) as Record<string, number>;
    const v2 = meta.intelligence_v2 as
      | { entities?: Array<{ name?: string }>; reader_keywords?: string[] }
      | undefined;
    const regional = meta.regional as
      | { primary_district?: string; district?: string }
      | undefined;
    const tags = Array.isArray(row.tags)
      ? row.tags.filter(
          (tag): tag is string => typeof tag === "string" && Boolean(tag.trim())
        )
      : [];
    const entityNames = Array.isArray(v2?.entities)
      ? v2.entities
          .map((entity) => entity.name?.trim())
          .filter((name): name is string => Boolean(name))
      : [];
    const readerKeywords = Array.isArray(v2?.reader_keywords)
      ? v2.reader_keywords.filter(
          (keyword): keyword is string =>
            typeof keyword === "string" && Boolean(keyword.trim())
        )
      : [];

    return {
      id: row.id as string,
      slug: row.slug as string,
      headline: row.headline as string,
      summary: (row.summary as string) ?? null,
      editorial_status: (row.editorial_status ?? "approved") as
        | "pending"
        | "approved"
        | "rejected",
      workflow_status:
        typeof row.workflow_status === "string" ? row.workflow_status : null,
      homepage_pin: Boolean(row.homepage_pin),
      is_breaking: Boolean(meta.is_breaking),
      is_featured: Boolean(meta.is_featured) || Boolean(row.homepage_pin),
      published_at: (row.published_at as string) ?? null,
      ai_confidence: (meta.ai_confidence as number) ?? null,
      readability: breakdown.readability ?? null,
      seo_quality: breakdown.seo_quality ?? null,
      local_relevance: breakdown.local_relevance ?? null,
      originality: breakdown.originality ?? null,
      source_count: (meta.source_count as number) ?? null,
      event_id: (row.event_id as string) ?? null,
      language: (row.language as string) ?? null,
      created_at: row.created_at as string,
      source_attribution: [],
      hero_image_url: (row.hero_image_url as string) ?? null,
      tags,
      publish_decision:
        typeof meta.publish_decision === "string" ? meta.publish_decision : null,
      used_fallback: Boolean(meta.used_fallback),
      repaired: Boolean(meta.repaired),
      has_intelligence_v2: Boolean(meta.intelligence_v2),
      entity_names: entityNames,
      reader_keywords: readerKeywords,
      district:
        regional?.primary_district?.trim() ||
        regional?.district?.trim() ||
        null,
      category_label: tags[0]?.trim() || null,
    };
  });
}

function mapBilling(
  row: Record<string, unknown> | null
): DashboardBillingPlan | null {
  if (!row) return defaultBilling();

  return {
    planId: String(row.plan_id ?? "starter"),
    planStatus: String(row.plan_status ?? "trialing"),
    articlesLimit: Number(row.articles_limit ?? 500),
    articlesUsed: Number(row.articles_used ?? 0),
    apiCallsLimit: Number(row.api_calls_limit ?? 10000),
    apiCallsUsed: Number(row.api_calls_used ?? 0),
    currentPeriodEnd: (row.current_period_end as string) ?? null,
    stripeCustomerId: (row.stripe_customer_id as string) ?? null,
  };
}

function defaultBilling(): DashboardBillingPlan {
  return {
    planId: "starter",
    planStatus: "trialing",
    articlesLimit: 500,
    articlesUsed: 0,
    apiCallsLimit: 10000,
    apiCallsUsed: 0,
    currentPeriodEnd: null,
    stripeCustomerId: null,
  };
}

function devTeamMember(session: DashboardSession): DashboardTeamMember {
  return {
    id: "dev",
    email: session.email,
    role: session.membership.role,
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

function aggregateApiMetrics(
  rows: Array<{
    route: string;
    method: string;
    status_code: number | null;
    latency_ms: number | null;
  }>
): DashboardApiMetric[] {
  const map = new Map<
    string,
    { count: number; latencySum: number; errors: number; lastStatus: number | null }
  >();

  for (const row of rows) {
    const key = `${row.method} ${row.route}`;
    const prev = map.get(key) ?? {
      count: 0,
      latencySum: 0,
      errors: 0,
      lastStatus: null,
    };
    const isError = (row.status_code ?? 200) >= 400;
    map.set(key, {
      count: prev.count + 1,
      latencySum: prev.latencySum + (row.latency_ms ?? 0),
      errors: prev.errors + (isError ? 1 : 0),
      lastStatus: row.status_code ?? prev.lastStatus,
    });
  }

  return [...map.entries()]
    .map(([key, v]) => {
      const [method, ...routeParts] = key.split(" ");
      return {
        route: routeParts.join(" "),
        method,
        count: v.count,
        avgLatencyMs: v.count ? Math.round(v.latencySum / v.count) : 0,
        errorRate: v.count ? v.errors / v.count : 0,
        lastStatus: v.lastStatus,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}
