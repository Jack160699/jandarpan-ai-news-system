/**
 * Homepage Redis key builders — must match getGeneratedHomepageFeed cache writes.
 */

import { CACHE_KEYS } from "@/lib/infrastructure/cache";
import { NEWS_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
import {
  NEWSROOM_LANGUAGES,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import {
  getTenantBySlug,
  listStaticTenants,
} from "@/lib/tenant/registry";
import type { TenantConfig } from "@/lib/tenant/types";

export function buildHomepageFeedRedisKey(
  tenantSlug: string,
  language: NewsroomLanguage
): string {
  return `${CACHE_KEYS.homepageFeed}:${tenantSlug}:${language}`;
}

/** Legacy base key (pre-tenant); deleted on invalidate for safety. */
export const LEGACY_HOMEPAGE_FEED_REDIS_KEY = CACHE_KEYS.homepageFeed;

/** Legacy segment micro-cache bases (pre Phase 8 global keys). */
export const HOMEPAGE_SEGMENT_REDIS_KEYS = [
  NEWS_CACHE_KEYS.homepage,
  NEWS_CACHE_KEYS.breaking,
  NEWS_CACHE_KEYS.regional,
] as const;

function segmentKeyForTenant(base: string, tenantSlug: string): string {
  return `${base}:t:${tenantSlug}`;
}

function languagesForTenant(tenant: TenantConfig | null): NewsroomLanguage[] {
  const enabled = tenant?.newsroom.enabledLanguages;
  if (enabled?.length) {
    return enabled.filter((lang): lang is NewsroomLanguage =>
      (NEWSROOM_LANGUAGES as readonly string[]).includes(lang)
    );
  }
  return [...NEWSROOM_LANGUAGES];
}

/**
 * Deterministic Redis keys to delete on homepage revalidation.
 * No SCAN — Cartesian product of known tenants × enabled languages per tenant.
 */
export function collectHomepageRedisInvalidationKeys(
  tenantSlugs: readonly string[]
): string[] {
  const keys = new Set<string>([
    LEGACY_HOMEPAGE_FEED_REDIS_KEY,
    ...HOMEPAGE_SEGMENT_REDIS_KEYS,
  ]);

  const staticBySlug = new Map(
    listStaticTenants().map((tenant) => [tenant.slug, tenant])
  );

  for (const slug of tenantSlugs) {
    const tenant = staticBySlug.get(slug) ?? getTenantBySlug(slug);
    for (const language of languagesForTenant(tenant)) {
      keys.add(buildHomepageFeedRedisKey(slug, language));
    }
    for (const base of HOMEPAGE_SEGMENT_REDIS_KEYS) {
      keys.add(segmentKeyForTenant(base, slug));
    }
  }

  return [...keys];
}

export async function listTenantSlugsForCacheInvalidation(): Promise<string[]> {
  const slugs = new Set(listStaticTenants().map((tenant) => tenant.slug));

  try {
    const { createAdminServerClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminServerClient();
    const { data } = await supabase
      .from("newsroom_tenants")
      .select("slug")
      .eq("status", "active");

    for (const row of data ?? []) {
      if (row.slug) slugs.add(row.slug);
    }
  } catch {
    /* Redis invalidation still covers static tenants */
  }

  return [...slugs];
}
